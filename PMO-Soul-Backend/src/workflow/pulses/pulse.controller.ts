import { Controller, Get, Post, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../../guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPulseRegistry } from './catalog';
import { buildTriggerInput, reuseRealTriggerInput } from './core';
import { PulseWorkflowRunner } from './services/pulse-live-runner';
import { OpenApiStore } from './services/openapi-store';

interface ApiEndpoint {
  method: string;
  path: string;
  tag: string;
  summary: string;
  operationId?: string;
  hasBody: boolean;
  // The endpoint's own request-body property names and query-param names, so the
  // designer can pre-fill the Body / Query mappers the moment an endpoint is picked.
  bodyFields: string[];
  queryParams: string[];
}

interface TestNodeBody {
  type: string;
  config?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  seed?: Record<string, Array<Record<string, unknown>>>;
  /** Lets the designer Skip / Stop a Wait being tested (workflow test-runs routes). */
  runId?: string;
}

interface TriggerInputBody {
  /** The saved workflow, to find its last real run. Absent for a workflow never saved. */
  workflowId?: string;
  /** The trigger step as it is in the designer now (type + config, including its typed sample). */
  trigger: { type: string; config?: Record<string, unknown> };
  /** The workflow's table, for record triggers. */
  entity?: string;
  /**
   * auto     — the last real run if there is one, else the typed sample (else, record triggers
   *            only, the newest row);
   * lastRun  — the last real run only (null when there is none);
   * sample   — what the designer typed / picked, never a real run.
   */
  prefer?: 'auto' | 'lastRun' | 'sample';
  /** sample: what the designer chose (a record they picked, a body they typed). */
  given?: unknown;
}

interface TestRunBody {
  definition: { nodes: unknown[]; edges: unknown[] };
  variables?: Record<string, unknown>;
  seed?: Record<string, Array<Record<string, unknown>>>;
}

/**
 * Serves the Pulses designer manifest and runs TEST executions.
 *
 * `test-node` runs a single pulse; `test-run` runs a whole pulse definition. Both run FOR REAL,
 * like n8n's and Activepieces' tests: records are written and kept, email and notifications are
 * delivered, HTTP calls are made. See `PulseWorkflowRunner.runTestFlow`.
 */
@ApiTags('Workflow Pulses')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('workflow/pulses')
export class PulseController {
  private readonly registry = buildPulseRegistry();

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PulseWorkflowRunner,
  ) {}

  @Get('sample-data')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Load a real record of an entity as simulated trigger data' })
  async sampleData(@Query('entity') entity?: string) {
    if (!entity) return {};
    const model = entity.charAt(0).toLowerCase() + entity.slice(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[model];
    if (!delegate?.findFirst) throw new BadRequestException(`Unknown entity "${entity}"`);

    // Newest record (tenant-scoped by the Prisma middleware). Fall back if the
    // model has no createdAt to order by.
    const record =
      (await delegate.findFirst({ orderBy: { createdAt: 'desc' } }).catch(() => null)) ??
      (await delegate.findFirst().catch(() => null));
    if (!record) return {};

    // Resolve ownerEmail — a derived field the live trigger subsystem provides.
    let ownerEmail: string | undefined;
    if (record.ownerId != null) {
      const owner = await this.prisma.user
        .findFirst({ where: { id: Number(record.ownerId) }, select: { email: true } })
        .catch(() => null);
      ownerEmail = owner?.email ?? undefined;
    }
    return ownerEmail ? { ...record, ownerEmail } : record;
  }

  @Get('sample-records')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: "Recent real records of an entity, to pin as a workflow's trigger sample data" })
  @ApiQuery({ name: 'entity', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async sampleRecords(@Query('entity') entity?: string, @Query('limit') limit?: string) {
    if (!entity) return [];
    const model = entity.charAt(0).toLowerCase() + entity.slice(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[model];
    if (!delegate?.findMany) throw new BadRequestException(`Unknown entity "${entity}"`);

    // Newest first (tenant-scoped by the Prisma middleware). Fall back to an
    // unordered read for models without a createdAt column.
    const take = Math.min(Number(limit) > 0 ? Number(limit) : 8, 25);
    const rows =
      (await delegate.findMany({ orderBy: { createdAt: 'desc' }, take }).catch(() => null)) ??
      (await delegate.findMany({ take }).catch(() => []));
    return rows;
  }

  @Get('sample-skeleton')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({
    summary: 'A schema-accurate sample record for an entity (used when no real rows exist yet)',
  })
  @ApiQuery({ name: 'entity', required: true })
  sampleSkeleton(@Query('entity') entity?: string) {
    if (!entity) return {};
    const model = Prisma.dmmf.datamodel.models.find(
      (m) => m.name.toLowerCase() === entity.toLowerCase(),
    );
    if (!model) throw new BadRequestException(`Unknown entity "${entity}"`);

    const enums = Prisma.dmmf.datamodel.enums;
    const out: Record<string, unknown> = {};
    for (const f of model.fields) {
      // Skip relation navigation fields (the FK scalar is emitted on its own).
      if (f.kind === 'object' || f.relationName) continue;
      out[f.name] = this.sampleFieldValue(f, enums);
    }
    return out;
  }

  /** A plausible, correctly-typed placeholder for one Prisma field. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sampleFieldValue(f: any, enums: readonly any[]): unknown {
    if (f.isList) return [];
    if (f.kind === 'enum') {
      const e = enums.find((x) => x.name === f.type);
      return e?.values?.[0]?.name ?? 'VALUE';
    }
    if (f.isId || f.name === 'id') return f.type === 'String' ? 'sample-id' : 1;
    const name = String(f.name).toLowerCase();
    switch (f.type) {
      case 'Boolean':
        return false;
      case 'Int':
      case 'BigInt':
      case 'Float':
      case 'Decimal':
        return name.endsWith('id') ? 1 : 0;
      case 'DateTime':
        return new Date().toISOString();
      case 'Json':
        return {};
      default: {
        // String — light name-based heuristics so the sample reads realistically.
        if (name.includes('email')) return 'sample@example.com';
        if (name === 'name' || name.endsWith('name')) return 'Sample';
        if (name.includes('status') || name.includes('state')) return 'active';
        if (name.includes('phone')) return '+10000000000';
        return 'sample';
      }
    }
  }

  @Get('manifest')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'List available Pulses (palette + config + I/O) for the designer' })
  manifest() {
    return this.registry.manifest();
  }

  @Get('api-catalog')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: "List the app's callable internal APIs (from OpenAPI) for the endpoint picker" })
  apiCatalog(): ApiEndpoint[] {
    const doc = OpenApiStore.get();
    if (!doc?.paths) return [];
    const out: ApiEndpoint[] = [];
    for (const [path, item] of Object.entries(doc.paths)) {
      // Query params can also be declared once at the path level (shared by every
      // method), so seed each operation's params with them.
      const pathParams = Array.isArray((item as Record<string, unknown>).parameters)
        ? ((item as Record<string, unknown>).parameters as unknown[])
        : [];
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const op = (item as Record<string, unknown>)[method] as
          | {
              tags?: string[];
              summary?: string;
              operationId?: string;
              requestBody?: unknown;
              parameters?: unknown[];
            }
          | undefined;
        if (!op) continue;
        // Skip the Swagger UI and the pulses' own routes.
        if (path.includes('/swagger') || path.includes('/workflow/pulses')) continue;
        out.push({
          method: method.toUpperCase(),
          path,
          tag: op.tags?.[0] ?? 'Other',
          summary: op.summary ?? '',
          operationId: op.operationId,
          hasBody: !!op.requestBody,
          bodyFields: this.bodyFields(doc, op.requestBody),
          queryParams: this.queryParams(doc, [...pathParams, ...(op.parameters ?? [])]),
        });
      }
    }
    // Group-friendly ordering: by tag, then path.
    out.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path));
    return out;
  }

  /** Resolve a local `#/components/...` $ref against the OpenAPI document. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveRef(doc: any, node: any): any {
    let cur = node;
    // Follow chained refs defensively (bounded), never loop forever.
    for (let i = 0; cur && typeof cur === 'object' && cur.$ref && i < 10; i++) {
      const parts = String(cur.$ref).replace(/^#\//, '').split('/');
      cur = parts.reduce((acc: any, key: string) => (acc ? acc[key] : undefined), doc);
    }
    return cur;
  }

  /** Property names of an operation's JSON request body (handles $ref + allOf). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bodyFields(doc: any, requestBody: any): string[] {
    if (!requestBody) return [];
    const rb = this.resolveRef(doc, requestBody);
    const schema =
      rb?.content?.['application/json']?.schema ??
      rb?.content?.[Object.keys(rb?.content ?? {})[0]]?.schema;
    return this.schemaProps(doc, schema);
  }

  /** Collect property names from a schema, merging allOf and resolving $refs. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private schemaProps(doc: any, schema: any): string[] {
    const s = this.resolveRef(doc, schema);
    if (!s || typeof s !== 'object') return [];
    if (Array.isArray(s.allOf)) {
      return Array.from(new Set(s.allOf.flatMap((sub: any) => this.schemaProps(doc, sub))));
    }
    if (s.type === 'array' && s.items) return this.schemaProps(doc, s.items);
    return s.properties && typeof s.properties === 'object' ? Object.keys(s.properties) : [];
  }

  /** Names of the `in: query` parameters (resolving any parameter $refs). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queryParams(doc: any, params: any[]): string[] {
    const names = (Array.isArray(params) ? params : [])
      .map((p) => this.resolveRef(doc, p))
      .filter((p) => p && p.in === 'query' && p.name)
      .map((p) => String(p.name));
    return Array.from(new Set(names));
  }

  /**
   * What a run of this trigger starts with, for Simulate and Test flow — built by the same function
   * the live entry points use (core/trigger-input), from the trigger's own declaration. A webhook
   * gets a call, a schedule a tick, a sign-up the submitted details: never a row of the table,
   * which only record triggers start with. Best first: the input of this workflow's last REAL run
   * of this trigger (secrets replaced), then the designer's typed sample.
   */
  @Post('trigger-input')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: "A trigger's run input for Simulate / Test flow: last real run, else the typed sample" })
  async triggerInput(@Body() body: TriggerInputBody) {
    const type = body?.trigger?.type;
    const spec = type ? this.registry.get(type)?.meta.triggerInput : undefined;
    if (!type || !spec) throw new BadRequestException('Not a trigger: ' + String(type));
    const config = body.trigger.config ?? {};
    const prefer = body.prefer ?? 'auto';

    // The last real run of THIS trigger on THIS workflow. The workflow is read first, under the
    // tenant scope, so a run of someone else's workflow can never be read through this.
    let last: { id: string; startedAt: Date; triggerData: unknown } | null = null;
    if (body.workflowId && prefer !== 'sample') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wf = await (this.prisma as any).workflow.findFirst({ where: { id: String(body.workflowId) }, select: { id: true } });
      if (wf) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        last = await (this.prisma as any).workflowRun.findFirst({
          where: { workflowId: wf.id, triggerEvent: spec.event },
          orderBy: { startedAt: 'desc' },
          select: { id: true, startedAt: true, triggerData: true },
        });
      }
    }
    const lastRun = last ? { id: last.id, at: last.startedAt } : null;

    if (last && prefer !== 'sample') {
      const data = reuseRealTriggerInput(spec, config, last.triggerData, type);
      return { from: 'lastRun', source: spec.source, data, variables: this.runner.triggerVariables(data), lastRun };
    }
    if (prefer === 'lastRun') return { from: null, source: spec.source, data: null, variables: null, lastRun };

    if (spec.source === 'record') {
      // A record trigger starts with a row: the one picked, else the newest one.
      let row: unknown = body.given;
      let from: 'sample' | 'record' | null = row && typeof row === 'object' ? 'sample' : null;
      if (!from && body.entity) {
        const rows = await this.sampleRecords(body.entity, '1').catch(() => []);
        row = rows?.[0];
        from = row ? 'record' : null;
      }
      if (!from) return { from: null, source: spec.source, data: null, variables: null, lastRun };
      const data = buildTriggerInput(spec, config, row, { type, test: true });
      return { from, source: spec.source, data, variables: this.runner.triggerVariables(data), lastRun };
    }

    const data = buildTriggerInput(spec, config, body.given, { type, test: true });
    return { from: 'sample', source: spec.source, data, variables: this.runner.triggerVariables(data), lastRun };
  }

  @Post('test-node')
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Run one pulse for real with its config and the given upstream data' })
  async testNode(@Body() body: TestNodeBody) {
    if (!this.registry.get(body.type)) throw new NotFoundException(`Unknown pulse "${body.type}"`);
    return this.runner.runTestPulse(body.type, body.config ?? {}, body.variables ?? {}, body.runId);
  }

  @Post('test-run')
  @RequirePermission('Workflow', 'update')
  @ApiOperation({
    summary: 'Run a whole pulse workflow for real; returns each step output',
  })
  async testRun(@Body() body: TestRunBody) {
    return this.runner.runTestFlow(body.definition, body.variables ?? {});
  }
}
