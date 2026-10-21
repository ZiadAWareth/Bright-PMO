import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApisIntrospectorService } from '../../apis-introspector/apis-introspector.service';
import { buildPulseRegistry } from '../../workflow/pulses';
import { buildSchemaContext, EntityContext, SchemaContext } from './schema-context';
import { buildWorkflowContext, WorkflowContext } from './workflow-context';
import { buildCatalogContext, CatalogContext } from './catalog-context';
import { buildRedactionPolicy, RedactedFieldRef, RedactionPolicy } from './redaction';
import { withinCeiling } from '../agent-scope';

/**
 * Everything the app knows about itself. Layer 1 of the plan — built and useful with NO API key
 * configured, which is why Phase 1 is independently testable and why the inspector page costs
 * nothing to run.
 */
export interface GroundingPack {
  appName: string;
  schema: SchemaContext;
  workflows: WorkflowContext;
  catalog: CatalogContext;
  /** Every field whose values are withheld, so redaction is visible rather than silent. */
  redactedFields: RedactedFieldRef[];
  /** How many entities are withheld from this run — by the user's role, by the agent's entity
   *  ceiling, or by both. A count, not a list: naming them would leak the existence of data the
   *  user is not allowed to know about. */
  hiddenByPermissionCount: number;
  version: string;
  builtAt: string;
}

/** The permission map AuthGuard puts on the request: { ticket: { get: true, create: false } }. */
export type UserPermissions = Record<string, Record<string, boolean> | undefined>;

export interface GroundingAudience {
  permissions?: UserPermissions;
  isPlatformAdmin?: boolean;
  /**
   * A configured agent's entity ceiling (plan 3.2). Omit for the assistant page, which has no
   * Agent row behind it. `[]` means no entity at all — see `ScopeCeiling`.
   *
   * Applied here rather than at the tool boundary because the tools resolve entities out of THIS
   * pack: `query_data` looks the entity up in `ctx.grounding.schema.entities`, so an entity
   * removed here is not merely hidden from the prompt, it is unreachable.
   */
  allowedEntities?: string[] | null;
}

/**
 * Engine tables the agent should not describe as business data. Users do not think of these as
 * part of their app, and every entity in the pack is paid for in tokens on every request.
 */
const EXCLUDED_ENTITIES = [
  'WorkflowVersion',
  'WorkflowRun',
  'WorkflowRunStep',
  // Human tasks. Excluded for the same reason as the run tables, plus one of its own: formData
  // is whatever the assignee typed, with no record of which entity any of it came from, so the
  // redaction policy has nothing to key on. Surfacing tasks to the agent needs a dedicated tool
  // that returns metadata only, the way read_run_history does. (No backticks in this comment: it
  // sits inside the emitted template literal.)
  'WorkflowTask',
  'NotificationDelivery',
  // The assistant's OWN configuration. Its key columns are redacted anyway, but describing this
  // table invites the model to answer questions about the AI setup when it was asked about the
  // business — and it is paid for in tokens on every single request to say so.
  'AgentSetting',
  // The app's mail transport and its sign-in plumbing. Same reasoning as AgentSetting, plus a
  // sharper one: AuthSetupToken and AuthLoginCode hold credentials in flight, and the surest way for
  // an assistant never to read one out is for it not to know the tables exist.
  'MailSetting',
  'AuthSetting',
  'AuthSetupToken',
  // Encrypted connection values to outside systems: the assistant must not know the table exists.
  'ConnectorConnection',
  // Dynamic Dashboards: the encrypted Dashboard Engine key and embed tokens. Same reasoning.
  'DashboardEngineConnection',
  'DashboardEngineOrg',
  'EmbeddedDashboard',
  'AuthLoginCode',
  // When each person's sessions were ended: security plumbing, not business data.
  'AuthSessionRevocation',
];

/** Workflows are edited in the live app, so the pack must not lag far behind the canvas. */
const WORKFLOW_TTL_MS = 30000;

@Injectable()
export class GroundingService {
  private readonly logger = new Logger(GroundingService.name);

  private staticParts?: { schema: SchemaContext; catalog: CatalogContext; policy: RedactionPolicy };
  private workflowCache?: { value: WorkflowContext; expiresAt: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly introspector: ApisIntrospectorService,
  ) {}

  /** Builds the pack as seen by one audience. Pass no audience for the unfiltered pack. */
  async getPack(audience: GroundingAudience = {}): Promise<GroundingPack> {
    const parts = this.getStaticParts();
    const workflows = await this.getWorkflowContext();
    const filtered = this.applyPermissions(parts.schema, parts.catalog, audience);

    return {
      appName: 'another test PMO',
      schema: filtered.schema,
      workflows,
      catalog: filtered.catalog,
      redactedFields: parts.policy.list(),
      hiddenByPermissionCount: filtered.hiddenCount,
      version: parts.schema.fingerprint + '-' + parts.catalog.fingerprint + '-' + workflows.fingerprint,
      builtAt: new Date().toISOString(),
    };
  }

  /** The redaction policy every tool must route record values through (plan §11.2). */
  getRedactionPolicy(): RedactionPolicy {
    return this.getStaticParts().policy;
  }

  /**
   * Drops the caches so the pack cannot describe a column that no longer exists (plan §11.4).
   *
   * KNOWN LIMIT: hot migration alters the database but does not re-run prisma generate in the
   * running process, so Prisma.dmmf — and therefore the schema half of the pack — stays as it was
   * at boot until the app restarts. Invalidating here is correct and free, but it cannot fix that;
   * the fix belongs in the refresh-prisma path, not in the agent.
   */
  invalidate(): void {
    this.staticParts = undefined;
    this.workflowCache = undefined;
  }

  private getStaticParts() {
    if (!this.staticParts) {
      const schema = buildSchemaContext(Prisma.dmmf.datamodel as any, {
        excludeEntities: EXCLUDED_ENTITIES,
      });
      const catalog = buildCatalogContext(
        this.introspector.getRoutes() as any,
        buildPulseRegistry().manifest() as any,
      );
      const policy = buildRedactionPolicy(schema.entities);
      this.staticParts = { schema, catalog, policy };
      this.logger.log(
        'Grounding built: ' +
          schema.entities.length + ' entities, ' +
          catalog.routes.length + ' routes, ' +
          policy.list().length + ' redacted fields',
      );
    }
    return this.staticParts;
  }

  private async getWorkflowContext(): Promise<WorkflowContext> {
    if (this.workflowCache && this.workflowCache.expiresAt > Date.now()) {
      return this.workflowCache.value;
    }

    const descriptions: Record<string, string> = {};
    for (const entry of buildPulseRegistry().manifest()) {
      descriptions[entry.meta.type] = entry.meta.description;
    }

    let rows: any[] = [];
    try {
      rows = await this.prisma.workflow.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          entityName: true,
          status: true,
          version: true,
          definition: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // The rest of the pack is still correct and still useful. Failing the whole request because
      // one table is unreachable would make the assistant look broken for a workflow-table fault.
      this.logger.warn('Could not read workflows for grounding: ' + (error as Error).message);
    }

    const value = buildWorkflowContext(rows, { pulseDescriptions: descriptions });
    this.workflowCache = { value, expiresAt: Date.now() + WORKFLOW_TTL_MS };
    return value;
  }

  /**
   * Removes what this user may not read. Applied to the pack itself rather than at the tool
   * boundary so the model is never even told the entity exists — a model that knows about a table
   * it cannot query will keep offering to query it.
   */
  private applyPermissions(
    schema: SchemaContext,
    catalog: CatalogContext,
    audience: GroundingAudience,
  ): { schema: SchemaContext; catalog: CatalogContext; hiddenCount: number } {
    const ceiling = audience.allowedEntities;
    const unrestricted = audience.isPlatformAdmin || !audience.permissions;

    // The short-circuit checks the CEILING too, not just the permissions. An agent's ceiling is
    // not a permission — it is a cap — so it has to hold for a platform admin exactly as it does
    // for anyone else. Returning early on `isPlatformAdmin` alone would mean the one caller who
    // can already see everything is also the one the agent's limits stop applying to.
    if (unrestricted && (ceiling === undefined || ceiling === null)) {
      return { schema, catalog, hiddenCount: 0 };
    }

    const permissions = audience.permissions;
    const canRead = (entity: string): boolean => {
      // Intersection, and the ceiling is applied first because it is the cheaper test and the
      // stricter one. Narrowest wins: both have to say yes.
      if (!withinCeiling(entity, ceiling)) return false;
      if (unrestricted) return true;
      const entry = permissions![entity.toLowerCase()];
      if (!entry) return false;
      return Boolean(entry.get || entry.getAll);
    };

    const visible = schema.entities.filter((entity) => canRead(entity.name));
    const visibleNames = new Set(visible.map((entity) => entity.name.toLowerCase()));

    // Relations pointing at a hidden entity must go too, or the pack leaks the hidden entity's
    // name through the back door.
    const entities: EntityContext[] = visible.map((entity) => ({
      ...entity,
      relations: entity.relations.filter((relation) =>
        visibleNames.has(relation.target.toLowerCase()),
      ),
    }));

    const usedEnums = new Set<string>();
    for (const entity of entities) {
      for (const field of entity.fields) {
        if (field.kind === 'enum') usedEnums.add(field.type);
      }
    }

    return {
      schema: {
        ...schema,
        entities,
        enums: schema.enums.filter((definition) => usedEnums.has(definition.name)),
      },
      catalog: {
        ...catalog,
        routes: catalog.routes.filter(
          (route) => !route.entity || visibleNames.has(route.entity.toLowerCase()),
        ),
      },
      hiddenCount: schema.entities.length - entities.length,
    };
  }
}
