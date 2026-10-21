import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { getTenantContext, PLATFORM_ORG } from '../organization-scope/tenant-context';

/**
 * Client for the external reporting engine (renders PDF/XLSX from a SQL query
 * spec). The engine connects to the database ITSELF, so it needs a reachable
 * connection string — `Reporting_DATABASE_URL` (falls back to `DATABASE_URL`).
 * The engine service URL is `REPORT_ENGINE_BASE_URL`.
 */
const REPORT_ENGINE_BASE_URL =
  process.env.REPORT_ENGINE_BASE_URL || 'http://localhost:8080';

/**
 * ── Multi-tenant scoping for the report builder (PG-11, reporting arm) ──
 *
 * The engine connects to the database with raw JDBC and runs SQL directly, so
 * it bypasses the Prisma tenant middleware entirely. Isolation for reports is
 * therefore enforced HERE, on the server, before every engine call — never in
 * the browser or the engine. The rule deliberately MIRRORS the Prisma layer
 * (prisma.service.ts) so a report can never surface a row the app itself would
 * hide:
 *
 *   - A platform admin (or trusted system context) is unrestricted.
 *   - Every other principal is a single-organization tenant:
 *       • the `Organization` table is never selectable (it IS the tenant list);
 *       • every org-scoped table is filtered to `organizationId IN (org, 0)` —
 *         the tenant's own rows plus the shared PLATFORM_ORG reference rows —
 *         EXCEPT the identity tables (User, RolesAndPermissions), which are
 *         filtered to `= org` so the platform's Super Admin user/role never
 *         leaks into a tenant's report (matching PLATFORM_PRIVATE in Prisma).
 *
 * The engine applies the WHERE clause to the PRIMARY table only and matches
 * related tables in memory by foreign key, so scoping the primary table
 * transitively scopes the joined output. The one case that does NOT self-scope
 * — an unscoped primary table joined to an org-scoped related table — is
 * rejected outright, because there is no primary filter to constrain it.
 */
const ORGANIZATION_TABLE = 'Organization';

/**
 * Identity tables whose PLATFORM_ORG rows must stay invisible to tenants.
 * Kept in lock-step with PLATFORM_PRIVATE in the generated prisma.service.ts.
 */
const PLATFORM_PRIVATE = new Set<string>(['User', 'RolesAndPermissions']);

interface ConnectionDto {
  databaseEngine: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  ssl?: boolean;
  sslmode?: string;
}

export interface PreviewResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

@Injectable()
export class ReportEngineService {
  private readonly logger = new Logger(ReportEngineService.name);

  private parseDatabaseUrl(databaseUrl: string): ConnectionDto {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get('sslmode') || undefined;
    return {
      databaseEngine: 'postgresql',
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      databaseName: url.pathname.substring(1).split('?')[0],
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ...(sslmode ? { sslmode, ssl: sslmode !== 'disable' } : {}),
    };
  }

  private getConnectionDto(): ConnectionDto {
    const databaseUrl =
      process.env.Reporting_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('Database URL not configured');
    }
    return this.parseDatabaseUrl(databaseUrl);
  }

  // ── Tenant scoping helpers ──────────────────────────────────────────────

  /**
   * True when the acting principal is a single-organization tenant that must be
   * scoped. Platform admins and trusted system contexts are unrestricted, so
   * they see every organisation's data. Read from the request-scoped tenant
   * context established by TenantMiddleware — the same source Prisma uses.
   */
  private isTenantRestricted(): boolean {
    const ctx = getTenantContext();
    return !(ctx?.isPlatformAdmin || ctx?.system);
  }

  /** The acting tenant's organization id, or null if none is on the context. */
  private currentOrg(): number | null {
    const org = getTenantContext()?.organizationId;
    return org == null ? null : Number(org);
  }

  /**
   * Validate a tenant-supplied WHERE fragment so it can be safely ANDed with the
   * injected org predicate without letting the tenant escape it. Rejects the two
   * ways a raw fragment could neutralise `(<clause>) AND <predicate>`:
   *   - closing the wrapping parenthesis to add a top-level OR (`x) OR (1=1`);
   *   - commenting out or terminating the statement (`--`, `#`, `/*`, `;`).
   * Content inside single-quoted string literals is ignored (so a literal like
   * `'a--b'` or `')'` is allowed). Throws ForbiddenException when unsafe.
   */
  private sanitizeTenantWhere(clause: string): string {
    let depth = 0;
    let inString = false;
    for (let i = 0; i < clause.length; i++) {
      const c = clause[i];
      if (inString) {
        if (c === "'") {
          if (clause[i + 1] === "'") { i++; continue; } // escaped '' inside literal
          inString = false;
        }
        continue;
      }
      if (c === "'") { inString = true; continue; }
      if (
        c === ';' ||
        c === '#' ||
        (c === '-' && clause[i + 1] === '-') ||
        (c === '/' && clause[i + 1] === '*')
      ) {
        throw new ForbiddenException(
          'Your filter contains characters that are not allowed (comments or ' +
            'statement separators). Use a plain condition such as ' +
            "status = 'Active'.",
        );
      }
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        // Went below the level it started at — it is trying to close the
        // parenthesis the server wraps around it. Refuse.
        if (depth < 0) {
          throw new ForbiddenException(
            'Your filter has unbalanced parentheses and cannot be applied.',
          );
        }
      }
    }
    if (inString || depth !== 0) {
      throw new ForbiddenException(
        'Your filter has an unterminated string or unbalanced parentheses and ' +
          'cannot be applied.',
      );
    }
    return clause;
  }

  /** The SQL predicate that scopes one table to the current tenant. */
  private orgPredicate(tableName: string, org: number): string {
    // Identity tables never share the platform's rows (mirrors PLATFORM_PRIVATE
    // in prisma.service.ts); every other org-scoped table also sees the shared
    // PLATFORM_ORG reference rows.
    return PLATFORM_PRIVATE.has(tableName)
      ? `"organizationId" = ${org}`
      : `"organizationId" IN (${org}, ${PLATFORM_ORG})`;
  }

  /**
   * Whether a table carries the tenant discriminator, by introspecting its
   * columns through the engine (no naming assumptions). Fails CLOSED: if the
   * columns can't be read we treat the table as scoped so a tenant can never
   * export it unfiltered.
   */
  private async tableHasOrganizationId(tableName: string): Promise<boolean> {
    try {
      const info = await this.fetchColumns(tableName);
      const cols: any[] = Array.isArray(info) ? info : (info?.columns ?? []);
      return cols.some(
        (c) =>
          String(c?.columnName ?? c?.name ?? '').toLowerCase() ===
          'organizationid',
      );
    } catch {
      return true;
    }
  }

  private async engineFetch(path: string, init: any): Promise<any> {
    const doFetch = (globalThis as any).fetch;
    if (typeof doFetch !== 'function') {
      throw new InternalServerErrorException(
        'global fetch is unavailable (Node 18+ required for the reporting engine client)',
      );
    }
    try {
      return await doFetch(`${REPORT_ENGINE_BASE_URL}${path}`, init);
    } catch (err: any) {
      // Network-level failure — the engine host itself is unreachable.
      this.logger.error(
        `Reporting engine unreachable at ${REPORT_ENGINE_BASE_URL}${path}: ${err?.message ?? err}`,
      );
      throw new ServiceUnavailableException(
        `Could not reach the reporting engine at ${REPORT_ENGINE_BASE_URL}. ` +
          `Check REPORT_ENGINE_BASE_URL, and note the engine must also be able to reach ` +
          `this app's database (Reporting_DATABASE_URL) — a localhost/private database is ` +
          `not reachable from a hosted engine, so reporting cannot run in local preview.`,
      );
    }
  }

  /** POST /api/v1/reports/tables — list tables the engine can see. */
  async tables(): Promise<any> {
    const dbConfig = this.getConnectionDto();
    const response = await this.engineFetch('/api/v1/reports/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbConfig),
    });
    if (!response.ok) {
      // The engine responded but couldn't complete — almost always because it
      // can't connect to Reporting_DATABASE_URL (e.g. a localhost DB in a local
      // preview, which the hosted engine can't reach).
      throw new ServiceUnavailableException(
        `The reporting engine couldn't read this app's database. In local preview the ` +
          `database usually isn't reachable from the hosted engine — point Reporting_DATABASE_URL ` +
          `at a publicly reachable database to enable reporting. Details: ${await response.text()}`,
      );
    }
    const tables = await response.json();
    // A tenant may never build reports on the Organization table — hide it from
    // the picker (defence in depth; preview() also rejects it).
    if (this.isTenantRestricted() && Array.isArray(tables)) {
      return tables.filter((t) => t !== ORGANIZATION_TABLE);
    }
    return tables;
  }

  /** Raw table-info call to the engine (no tenant guard). */
  private async fetchColumns(tableName: string): Promise<any> {
    const dbConfig = this.getConnectionDto();
    const response = await this.engineFetch(
      `/api/v1/reports/table-info?tableName=${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      },
    );
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Failed to load columns from reporting engine: ${await response.text()}`,
      );
    }
    return response.json();
  }

  /** POST /api/v1/reports/table-info?tableName= — column metadata for a table. */
  async columns(body: { tableName?: string }): Promise<any> {
    const tableName = body?.tableName;
    if (!tableName) throw new InternalServerErrorException('Table name is required');
    if (this.isTenantRestricted() && tableName === ORGANIZATION_TABLE) {
      throw new ForbiddenException(
        'Only a platform administrator may report on the Organization table.',
      );
    }
    return this.fetchColumns(tableName);
  }

  /** POST /api/v1/reports/table-relationships?tableName= — FK relationships. */
  async relationships(body: { tableName?: string }): Promise<any> {
    const tableName = body?.tableName;
    if (!tableName) throw new InternalServerErrorException('Table name is required');
    const restricted = this.isTenantRestricted();
    if (restricted && tableName === ORGANIZATION_TABLE) {
      throw new ForbiddenException(
        'Only a platform administrator may report on the Organization table.',
      );
    }
    const dbConfig = this.getConnectionDto();
    const response = await this.engineFetch(
      `/api/v1/reports/table-relationships?tableName=${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      },
    );
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Failed to load relationships from reporting engine: ${await response.text()}`,
      );
    }
    const rels = await response.json();
    // Never offer Organization as a joinable table to a tenant — every scoped
    // model has an FK to it, so it would otherwise appear in every join picker.
    if (restricted && Array.isArray(rels)) {
      return rels.filter(
        (r) =>
          r?.fromTable !== ORGANIZATION_TABLE && r?.toTable !== ORGANIZATION_TABLE,
      );
    }
    return rels;
  }

  /**
   * Applies tenant isolation to a report request, in place. No-op for platform
   * admins/system. For a tenant it rejects any use of the Organization table,
   * then injects the org filter onto the primary table's WHERE clause so the
   * engine only ever reads the tenant's own rows (plus shared reference rows).
   *
   * The engine filters the PRIMARY table and matches related tables in memory
   * by FK, so a scoped primary transitively scopes the joined output. The lone
   * gap — an UNSCOPED primary joined to an org-scoped related table, where no
   * primary filter can constrain the related rows — is rejected.
   */
  private async enforceTenantScope(requestBody: any): Promise<void> {
    if (!this.isTenantRestricted()) return;

    const primaryTable: string = requestBody?.primaryTable;
    const relatedTables: string[] = Array.isArray(requestBody?.relatedTables)
      ? requestBody.relatedTables
      : [];

    if (!primaryTable) {
      throw new InternalServerErrorException('Primary table is required');
    }

    // 1) Organization is never reportable by a tenant, as primary or as a join.
    if (
      primaryTable === ORGANIZATION_TABLE ||
      relatedTables.includes(ORGANIZATION_TABLE)
    ) {
      throw new ForbiddenException(
        'Only a platform administrator may report on the Organization table.',
      );
    }

    const org = this.currentOrg();
    const primaryScoped = await this.tableHasOrganizationId(primaryTable);

    // 2) A restricted principal with no organization on its context cannot be
    // safely scoped — fail closed rather than leak. (A well-formed tenant token
    // always carries organizationId; this guards a malformed/degenerate one.)
    if (org == null) {
      if (primaryScoped || (await this.anyScoped(relatedTables))) {
        throw new ForbiddenException(
          'Your session is not associated with an organization, so tenant-scoped ' +
            'data cannot be exported.',
        );
      }
      return; // purely non-tenant reference data — safe.
    }

    // 3) Scope the primary table; this transitively scopes the joined output.
    if (primaryScoped) {
      const predicate = this.orgPredicate(primaryTable, org);
      if (requestBody.whereClause) {
        // The WHERE box is raw SQL, so a tenant could otherwise neutralise the
        // injected filter — `1=1) OR (1=1` would surface every row, `... --`
        // would comment the ` AND <predicate>` away. Validate the user clause
        // so it cannot escape its own parentheses or terminate the statement,
        // THEN AND the predicate on: `(<safe user clause>) AND <predicate>`
        // always keeps the predicate at the top level.
        const safe = this.sanitizeTenantWhere(String(requestBody.whereClause));
        requestBody.whereClause = `(${safe}) AND ${predicate}`;
      } else {
        requestBody.whereClause = predicate;
      }
      return;
    }

    // 4) Primary is NOT org-scoped. Related tables are fetched WITHOUT a filter
    // and matched in memory, so an org-scoped related table here would leak
    // every organisation's rows. Refuse — there is no primary filter to lean on.
    if (await this.anyScoped(relatedTables)) {
      throw new ForbiddenException(
        'This report joins organization-scoped data through an unscoped table, ' +
          'which cannot be safely restricted to your organization.',
      );
    }
    // Otherwise the report touches only non-tenant reference data — allow as-is.
  }

  /** True if any of the given tables carries the tenant discriminator. */
  private async anyScoped(tableNames: string[]): Promise<boolean> {
    for (const t of tableNames) {
      if (await this.tableHasOrganizationId(t)) return true;
    }
    return false;
  }

  /**
   * Generate a report. Picks the engine endpoint by format (pdf/excel) and
   * whether related tables are involved (relational vs single-table).
   */
  async preview(requestBody: any): Promise<PreviewResult> {
    // Enforce tenant isolation BEFORE anything is sent to the engine. This may
    // mutate requestBody.whereClause (to inject the org filter) or throw.
    await this.enforceTenantScope(requestBody);

    const reportType = requestBody?.reportType;
    const primaryTable = requestBody?.primaryTable;
    const relatedTables = requestBody?.relatedTables;
    const dbConfig = this.getConnectionDto();

    const isExcel = reportType === 'excel';
    const isRelational = Array.isArray(relatedTables) && relatedTables.length > 0;

    let path = '/api/v1/reports/';
    const body: Record<string, unknown> = { connectionDto: dbConfig, ...requestBody };
    if (isRelational) {
      path += isExcel
        ? 'generate-relational-excel-with-columns'
        : 'generate-relational-with-columns';
    } else {
      path += isExcel ? 'generate-excel-with-columns' : 'generate-with-columns';
      body.tableName = primaryTable;
      body.selectedColumns = requestBody?.primaryTableColumns;
    }

    let response: any;
    try {
      response = await this.engineFetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: isExcel
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      this.logger.error(
        `Report engine unreachable at ${REPORT_ENGINE_BASE_URL}${path}: ${err?.message ?? err}`,
      );
      throw new InternalServerErrorException(
        `Report engine unreachable (${REPORT_ENGINE_BASE_URL}): ${err?.message ?? 'connection failed'}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Report engine ${response.status} at ${path} | db ${dbConfig.host}:${dbConfig.port}/${dbConfig.databaseName} sslmode=${dbConfig.sslmode ?? 'none'} | ${errorText || '(empty)'}`,
      );
      throw new InternalServerErrorException(
        `Error from report service: ${response.statusText} - ${errorText || 'check the engine can reach db host ' + dbConfig.host}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const isResponseExcel =
      contentType.includes('spreadsheetml') || contentType.includes('excel');
    const buffer = Buffer.from(await response.arrayBuffer());

    if (isResponseExcel || isExcel) {
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      };
    }
    return { buffer, contentType: 'application/pdf', extension: 'pdf' };
  }
}
