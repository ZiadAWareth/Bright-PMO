import { Injectable, OnModuleInit, OnModuleDestroy, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantContext, runAsSystem, PLATFORM_ORG } from '../organization-scope/tenant-context';

/**
 * Models carrying a tenant discriminator. Generated from the Prisma schema, so a
 * newly added entity is scoped from the moment it exists.
 */
const TENANT_SCOPED = new Set<string>(['ApprovalPolicy', 'SprintSnapshot', 'Lesson', 'CommentMention', 'MaintenanceSchedule', 'ResourceAssignment', 'Eps', 'Inspection', 'WorkItemLink', 'ActivityLog', 'CalendarException', 'Alert', 'EvmSnapshot', 'WorkItem', 'IntegrationConnection', 'Document', 'OrganizationSettings', 'ProjectMember', 'ProjectClosure', 'ChecklistItem', 'ApprovalPolicyStep', 'CostTransaction', 'Contract', 'Workflow', 'IdpInboxEvent', 'WorkItemStatus', 'ProjectLifecycleStep', 'ProgressReport', 'TimeEntry', 'Vendor', 'LifecycleTemplateStep', 'RfqResponse', 'Timesheet', 'EquipmentSiteLog', 'Site', 'Checklist', 'Handover', 'ProjectCategory', 'ClosureTemplateItem', 'SprintCapacity', 'Risk', 'Comment', 'WorkCalendar', 'WbsNode', 'RecurringWorkItem', 'LifecycleTemplate', 'Resource', 'Release', 'SavedReport', 'RefreshToken', 'UserProfile', 'ClosureTemplate', 'BudgetLine', 'Baseline', 'WorkItemDependency', 'Portfolio', 'RolesAndPermissions', 'WorkflowRule', 'MaintenanceLog', 'Sprint', 'PunchListItem', 'Project', 'ApprovalStep', 'Procurement', 'ClosureItem', 'BusinessUnit', 'RiskMitigation', 'ProjectConflict', 'StatusTransition', 'Notification', 'Benchmark', 'ApprovalRequest', 'WorkItemAssignee', 'ApiKey', 'User', 'BaselineItem', 'Escalation', 'WorkflowVersion', 'WorkflowRun', 'WorkflowRunStep', 'WorkflowTask', 'WorkflowTimer', 'WorkflowSchedule', 'AgentRun', 'AgentRunStep', 'AgentConversation', 'AgentMessage', 'Agent']);

/**
 * Models whose PLATFORM_ORG rows must NOT be visible to ordinary tenants.
 *
 * Every other scoped model shares platform-owned rows with all tenants on
 * purpose — that is how global reference data works. Identity is the exception:
 * the Super Admin user and the Super Admin role are both written with
 * organizationId = PLATFORM_ORG, so the shared-read rule exposed them in every
 * tenant's user list and role picker.
 *
 * For these, a tenant sees only its own rows. Platform admins bypass the
 * middleware entirely (above), so they still see everything.
 */
const PLATFORM_PRIVATE = new Set<string>(['User', 'RolesAndPermissions']);

/**
 * Models the platform PROVIDES to every organization. A row a platform administrator creates is
 * stamped isPlatform = true; every organization reads it, none may change it. A row an
 * organization creates stays its own. (The seeded Super Admin role is system work, so it stays
 * false and private to the platform.)
 */
const PLATFORM_SHARED = new Set<string>(['RolesAndPermissions', 'Workflow']);

/**
 * The tables the customer designed. Their records belong to organizations: the platform
 * administrator may read them, but not add them.
 */
const CUSTOMER_MODELS = new Set<string>(['ApprovalPolicy', 'SprintSnapshot', 'Lesson', 'CommentMention', 'MaintenanceSchedule', 'ResourceAssignment', 'Eps', 'Inspection', 'WorkItemLink', 'ActivityLog', 'CalendarException', 'Alert', 'EvmSnapshot', 'WorkItem', 'IntegrationConnection', 'Document', 'OrganizationSettings', 'ProjectMember', 'ProjectClosure', 'ChecklistItem', 'ApprovalPolicyStep', 'CostTransaction', 'Contract', 'IdpInboxEvent', 'WorkItemStatus', 'ProjectLifecycleStep', 'ProgressReport', 'TimeEntry', 'Vendor', 'LifecycleTemplateStep', 'RfqResponse', 'Timesheet', 'EquipmentSiteLog', 'Site', 'Checklist', 'Handover', 'ProjectCategory', 'ClosureTemplateItem', 'SprintCapacity', 'Risk', 'Comment', 'WorkCalendar', 'WbsNode', 'RecurringWorkItem', 'LifecycleTemplate', 'Resource', 'Release', 'RefreshToken', 'UserProfile', 'ClosureTemplate', 'BudgetLine', 'Baseline', 'WorkItemDependency', 'Portfolio', 'WorkflowRule', 'MaintenanceLog', 'Sprint', 'PunchListItem', 'Project', 'ApprovalStep', 'Procurement', 'ClosureItem', 'RiskMitigation', 'ProjectConflict', 'StatusTransition', 'Benchmark', 'ApprovalRequest', 'WorkItemAssignee', 'ApiKey', 'BaselineItem', 'Escalation']);

const CREATE_ACTIONS = new Set(['create', 'createMany', 'upsert']);

/**
 * Auto-number fields, per model: the format each one is filled with on create. Numbered per
 * organization, from AutoNumberCounter; {0000} is the number padded to that many digits, {YYYY}
 * and {MM} are the date — and with them the numbering restarts each year / month.
 */
const AUTO_NUMBERS: Record<string, Array<{ field: string; format: string }>> = {};

/** The counter's period: '' (never restarts), the year, or the year and month. */
export function autoNumberPeriod(format: string, d: Date): string {
  if (/\{MM\}/.test(format)) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  if (/\{YYYY\}/.test(format)) return String(d.getFullYear());
  return '';
}

/** INV-{YYYY}-{0000} with 7 → INV-2026-0007. A format without {0…} gets the number at its end. */
export function formatAutoNumber(format: string, n: number, d: Date): string {
  let placed = false;
  const out = format
    .replace(/\{YYYY\}/g, String(d.getFullYear()))
    .replace(/\{MM\}/g, String(d.getMonth() + 1).padStart(2, '0'))
    .replace(/\{(0+)\}/g, (_m: string, zeros: string) => {
      placed = true;
      return String(n).padStart(zeros.length, '0');
    });
  return placed ? out : out + String(n);
}

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** Combine a caller's where clause with the tenant filter without losing either. */
function mergeWhere(existing: any, filter: Record<string, unknown>) {
  if (!existing || Object.keys(existing).length === 0) return filter;
  return { AND: [existing, filter] };
}

/** `Account` -> `account`, to reach the Prisma delegate by model name. */
function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // Registered FIRST, so it runs before tenant scoping: it fills auto numbers on every create —
    // forms, imports, the API, workflow steps — and the tenant layer then stamps and checks as usual.
    this.applyAutoNumbers();
    this.applyTenantScoping();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully!');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      console.log('🔌 Database disconnected successfully!');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  /**
   * Auto numbers (INV-0001, INV-0002…), per organization. A value given explicitly (an import of
   * existing records) is kept. Otherwise the next number comes from AutoNumberCounter in ONE
   * statement — INSERT … ON CONFLICT … DO UPDATE … RETURNING — which Postgres serialises, so two
   * records created at the same moment never get the same number. A create that then fails leaves
   * a gap, as every database sequence does.
   */
  private applyAutoNumbers() {
    this.$use(async (params, next) => {
      const fields = params.model ? AUTO_NUMBERS[params.model] : undefined;
      if (!fields || !fields.length || !CREATE_ACTIONS.has(params.action)) return next(params);
      const ctx = getTenantContext();
      const fill = async (data: any) => {
        if (!data || typeof data !== 'object') return data;
        const raw = data.organizationId ?? ctx?.organizationId ?? PLATFORM_ORG;
        const org = Number.isFinite(Number(raw)) ? Number(raw) : PLATFORM_ORG;
        const out = { ...data };
        for (const f of fields) {
          if (out[f.field] !== undefined && out[f.field] !== null && out[f.field] !== '') continue;
          out[f.field] = await this.nextAutoNumber(params.model as string, f.field, f.format, org);
        }
        return out;
      };
      if (params.action === 'upsert') {
        params.args.create = await fill(params.args.create);
      } else if (Array.isArray(params.args?.data)) {
        // One at a time, so a batch is numbered in its own order.
        const rows: any[] = [];
        for (const d of params.args.data) rows.push(await fill(d));
        params.args.data = rows;
      } else if (params.args) {
        params.args.data = await fill(params.args.data);
      }
      return next(params);
    });
  }

  /** The next number for one field of one organization, formatted. */
  private async nextAutoNumber(model: string, field: string, format: string, org: number): Promise<string> {
    const now = new Date();
    const period = autoNumberPeriod(format, now);
    const rows: Array<{ value: number | bigint }> = await this.$queryRawUnsafe(
      'INSERT INTO "AutoNumberCounter" ("organizationId", "model", "field", "period", "value") VALUES ($1, $2, $3, $4, 1) ' +
        'ON CONFLICT ("organizationId", "model", "field", "period") DO UPDATE SET "value" = "AutoNumberCounter"."value" + 1 ' +
        'RETURNING "value"',
      org,
      model,
      field,
      period,
    );
    return formatAutoNumber(format, Number(rows[0]?.value ?? 1), now);
  }

  /**
   * PG-11 — tenant isolation.
   *
   * Reads are filtered to the acting tenant; writes are stamped with it; singular
   * update/delete verify ownership first, because a unique `where` cannot carry
   * the filter and would otherwise reach across tenants by id.
   */
  private applyTenantScoping() {
    this.$use(async (params, next) => {
      const model = params.model;
      const isOrganization = model === 'Organization';
      // Organization is not tenant-scoped in the usual sense — it IS the tenant,
      // and carries no organizationId to filter on. It was therefore excluded
      // entirely, which let any signed-in user list, edit and create every other
      // customer's organisation. It is scoped here by its own id instead.
      if (!model || (!TENANT_SCOPED.has(model) && !isOrganization)) return next(params);

      const ctx = getTenantContext();

      // Trusted internal work (seeds, migrations, queue workers) and platform
      // admins see everything. Both are explicit, never inferred.
      if (ctx?.system) return next(params);
      if (ctx?.isPlatformAdmin) {
        if (CREATE_ACTIONS.has(params.action)) {
          if (CUSTOMER_MODELS.has(model)) {
            throw new ForbiddenException(
              `${model} records belong to an organization. The platform administrator can view them but not add them: sign in as a user of that organization to add one.`,
            );
          }
          // What the platform creates here, it provides to every organization.
          if (PLATFORM_SHARED.has(model)) {
            const stamp = (d: any) => ({ ...d, isPlatform: true });
            if (params.action === 'upsert') params.args.create = stamp(params.args.create);
            else if (Array.isArray(params.args.data)) params.args.data = params.args.data.map(stamp);
            else params.args.data = stamp(params.args.data);
          }
        }
        return next(params);
      }

      // No tenant on the context means no authenticated principal — login and
      // startup run here. Those paths read User by email, which is not scoped.
      // Use == null (not !org): organizationId is numeric now and 0 is the
      // platform sentinel, which is a real value, not "absent".
      const org = ctx?.organizationId;
      if (org == null) return next(params);

      const action = params.action;
      // A tenant may only ever see itself; every other model filters on the
      // discriminator column.
      const ownFilter = isOrganization ? { id: org } : { organizationId: org };
      // Organization has no organizationId column — it must ALWAYS be scoped by its
      // own id (a tenant sees only itself), never by the organizationId filter that
      // fits every other model. Identity models never share the platform's rows
      // either; everything else shares the platform-owned (PLATFORM_ORG) rows.
      const baseFilter =
        isOrganization || PLATFORM_PRIVATE.has(model)
          ? ownFilter
          : { organizationId: { in: [org, PLATFORM_ORG] } };
      // Reads also see what the platform provides. Writes never do: update/delete/updateMany/
      // deleteMany check ownFilter, so a platform-provided row is read-only here.
      const tenantFilter = PLATFORM_SHARED.has(model) ? { OR: [baseFilter, { isPlatform: true }] } : baseFilter;
      params.args = params.args || {};

      if (READ_ACTIONS.has(action)) {
        params.args.where = mergeWhere(params.args.where, tenantFilter);
        return next(params);
      }

      switch (action) {
        // A unique lookup cannot carry an extra filter, so it is downgraded to
        // findFirst — otherwise any row could be fetched by id across tenants.
        case 'findUnique':
        case 'findUniqueOrThrow':
          params.action = action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
          params.args.where = mergeWhere(params.args.where, tenantFilter);
          return next(params);

        case 'create':
          // Creating an organisation means creating a tenant — a platform
          // action. A tenant principal never reaches here (platform admins
          // bypassed above), so refuse rather than silently mis-stamp.
          if (isOrganization) {
            throw new ForbiddenException('Only a platform administrator may create an organization');
          }
          params.args.data = { ...params.args.data, organizationId: org };
          return next(params);

        case 'createMany':
          if (isOrganization) {
            throw new ForbiddenException('Only a platform administrator may create an organization');
          }
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((d: any) => ({ ...d, organizationId: org }));
          }
          return next(params);

        case 'updateMany':
        case 'deleteMany':
          params.args.where = mergeWhere(params.args.where, ownFilter);
          return next(params);

        case 'update':
        case 'delete': {
          // The ownership condition goes INTO the write (Prisma 5: a unique where may carry
          // extra conditions), so it is checked by the same connection that writes. It used to
          // be a separate lookup on the root client — outside any transaction — so a record
          // created earlier in the SAME transaction (a workflow Test flow runs in one, rolled
          // back) looked missing, and updating it failed with "not found in the current
          // organization" while the same workflow worked for real.
          const where = params.args.where || {};
          params.args.where = { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ownFilter] };
          try {
            return await next(params);
          } catch (err: any) {
            // Prisma's "record to update/delete not found" — fails loudly rather than silently
            // affecting zero rows, and says why when the row belongs to the platform.
            if (err?.code !== 'P2025') throw err;
            const provided = PLATFORM_SHARED.has(model)
              ? await runAsSystem(() =>
                  (this as any)[delegateName(model)].findFirst({
                    where: mergeWhere(where, { isPlatform: true }),
                    select: { id: true },
                  }),
                )
              : null;
            if (provided) {
              throw new ForbiddenException(
                `This ${model === 'RolesAndPermissions' ? 'role' : 'workflow'} is provided by the platform. Only the platform administrator can change or delete it.`,
              );
            }
            throw new ForbiddenException(`${model} not found in the current organization`);
          }
        }

        case 'upsert': {
          const existing = await runAsSystem(() =>
            (this as any)[delegateName(model)].findFirst({
              where: params.args.where,
              select: { organizationId: true },
            }),
          );
          if (existing && existing.organizationId !== org) {
            throw new ForbiddenException(`${model} not found in the current organization`);
          }
          params.args.create = { ...params.args.create, organizationId: org };
          return next(params);
        }

        default:
          return next(params);
      }
    });
  }
}
