import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationQueueService } from '../../../notifications/notification-queue.service';
// The app's ONE mail sender. This step used to build its own transport from the node's config or
// from SMTP_* environment variables the generated .env never set, so a deployed app could not send
// mail at all until somebody edited the container's environment.
import { MailService } from '../../../mail/mail.service';
// A plain module (no Nest, no Prisma) shared with the auth module, so the engine can invite somebody
// without importing AuthService — which would be a cycle, since auth imports this runner.
import { issueInvite, publicBaseUrl } from '../../../auth/invites';
// Connectors: a plain module too, for the same reason — the runner must not import a Nest module.
import { runConnectorAction } from '../../../connectors/connector-runtime';
import { WorkflowGateway } from '../../gateway/workflow-gateway';
import { getTenantContext } from '../../../organization-scope/tenant-context';
import { matchesWatchFields } from '../../../shared/entity-event-payload';
import { buildTriggerInput, matchesRules, summarizeAgentUsage, declaredWorkflowInputs, shapeWorkflowInputs } from '../core';

/** The trigger of a workflow other workflows call: it runs whatever its status (as in n8n). */
const CALLED_BY_WORKFLOW = 'trigger.calledByWorkflow';
import { seedVariables } from '../../workflow-start.rules';
import { waitTimerDueAt } from '../../clock-rules';
import { buildPulseRegistry } from '../catalog';
import { renderAppEmail } from './app-email';
// The agent runtime, reached as a library rather than over HTTP. Safe in this direction only:
// the agent's grounding service imports `../../workflow/pulses`, which is core + catalog and
// never these services, so there is no import cycle.
import { AiSettingsService } from '../../../agent/ai-settings.service';
import { GroundingService } from '../../../agent/grounding/grounding.service';
import { AgentRunStore } from '../../../agent/agent-run.store';
import { runAgent } from '../../../agent/agent.runtime';
import { loadNamedAgent, prepareNamedAgent } from '../../../agent/named-agent';
import { parseAgentOutput } from '../../../agent/named-agent.rules';
import {
  PulseInterpreter,
  InMemoryPulseRunStore,
  runPulse,
  AgentStepError,
  createRunAgentBudget,
  type RunAgentBudget,
  type PulseContext,
  type PulseRegistry,
  type PulseServices,
  type PulseRunStore,
  type PulseWaitRecord,
  type PulseRunRecord,
  type PulseStepRecord,
  type PulseStepPatch,
  type PulseEmail,
  type PulseNotification,
  type PulseHttpRequest,
  type PulseAgentRequest,
  type PulseAgentResult,
} from '../core';

/** Side effects a test run captures instead of performing (except email — real). */
interface TestCaptures {
  emails: unknown[];
  notifications: unknown[];
  http: unknown[];
  logs: Array<{ level: string; message: string }>;
}

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}
/** Coerce a numeric-string id to a number (most entities use Int primary keys). */
/**
 * G8 — identifier coercion.
 *
 * Template values arrive as strings ("{{id}}" resolves to "42"), but Int primary
 * and foreign keys need numbers. The original version handled only `id`, so any
 * relation filter (`ownerId`, `accountId`, …) was silently left as a string and
 * matched nothing.
 *
 * Derived from the VALUE's shape rather than a hardcoded entity→field map: a
 * frozen map goes stale the moment the schema changes, which is the defect the
 * assessment recorded. Only fields that look like identifiers and hold an
 * all-digit string are converted, so a genuinely textual id (cuid, uuid) is
 * never mangled.
 */
function isIdentifierField(key: string): boolean {
  return key === 'id' || /(?:^|[a-z0-9])Id$/.test(key) || key.endsWith('_id');
}

function coerceIdentifiers(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') return data;
  let changed = false;
  const out: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(out)) {
    if (!isIdentifierField(key)) continue;
    if (typeof value !== 'string') continue;
    // Trimmed first: an id typed or bound with a stray space (" 30 ") is still id 30.
    const v = value.trim();
    if (/^\d+$/.test(v)) {
      out[key] = Number(v);
      changed = true;
    } else if (v !== value) {
      out[key] = v;
      changed = true;
    }
  }
  return changed ? out : data;
}

function coerceWhere(where: Record<string, unknown>): Record<string, unknown> {
  if (where && typeof where === 'object') return coerceIdentifiers(where);
  return where;
}

/**
 * Prisma-backed PulseRunStore — persists pulse runs to the SAME WorkflowRun /
 * WorkflowRunStep tables the legacy engine uses, so pulse runs show up in run
 * history and survive a restart (durable pause/resume for approvals & waits).
 */
class PrismaPulseRunStore implements PulseRunStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly triggerEvent: string,
    private readonly triggerData: unknown,
    /**
     * Resolves a recipient spec to user ids. Injected, not reimplemented: the runner already owns
     * this vocabulary (`role:Dispatcher`, a numeric user id, an email), and a second copy that
     * drifts means a task assigned to nobody — which looks exactly like no task at all.
     */
    private readonly resolveAssignees: (
      spec: string,
      org?: number,
      ownerId?: unknown,
    ) => Promise<string[]>,
  ) {}

  private mapStatus(s: PulseRunRecord['status']): string {
    return s === 'WAITING' ? 'PAUSED' : s; // RUNNING | COMPLETED | FAILED map 1:1
  }

  async createRun(rec: PulseRunRecord): Promise<void> {
    await this.prisma.workflowRun.create({
      data: {
        id: rec.id,
        workflowId: rec.workflowId,
        organizationId: rec.organizationId,
        triggerEvent: this.triggerEvent,
        triggerData: (this.triggerData ?? undefined) as any,
        status: 'RUNNING' as any,
        context: { variables: rec.variables } as any,
        definitionVersion: rec.definitionVersion,
      },
    });
  }

  async getRun(id: string): Promise<PulseRunRecord | null> {
    const r: any = await this.prisma.workflowRun.findUnique({ where: { id } });
    if (!r) return null;
    const ctx = (r.context as any) ?? {};
    return {
      id: r.id,
      workflowId: r.workflowId,
      organizationId: r.organizationId ?? undefined,
      status: (r.status === 'PAUSED' ? 'WAITING' : r.status) as PulseRunRecord['status'],
      variables: ctx.variables ?? {},
      pausedAtNodeId: ctx.pausedAtNodeId,
      error: r.error ?? undefined,
      definitionVersion: r.definitionVersion ?? undefined,
    };
  }

  /**
   * Filtered on NOT CANCELLED rather than a plain update by id: cancelRun can flip the row while
   * a walk is still in flight, and the walk's final save must not resurrect it as COMPLETED.
   */
  async saveRun(rec: PulseRunRecord): Promise<void> {
    const done = rec.status === 'COMPLETED' || rec.status === 'FAILED';
    await this.prisma.workflowRun.updateMany({
      where: { id: rec.id, NOT: { status: 'CANCELLED' as any } },
      data: {
        status: this.mapStatus(rec.status) as any,
        error: rec.error,
        context: { variables: rec.variables, pausedAtNodeId: rec.pausedAtNodeId } as any,
        completedAt: done ? new Date() : undefined,
      },
    });
  }

  async recordStep(step: PulseStepRecord): Promise<void> {
    await this.prisma.workflowRunStep.create({
      data: {
        runId: step.runId,
        nodeId: step.nodeId,
        nodeKind: 'pulse',
        nodeType: step.pulseType,
        status: step.status as any,
        input: (step.input ?? undefined) as any,
        output: (step.output ?? undefined) as any,
        error: step.error,
        durationMs: step.durationMs,
      },
    });
  }

  /** Settle the parked step: the WAITING row for (runId, nodeId) becomes COMPLETED / FAILED. */
  async updateStep(runId: string, nodeId: string, patch: PulseStepPatch): Promise<void> {
    await this.prisma.workflowRunStep.updateMany({
      where: { runId, nodeId, status: 'WAITING' as any },
      data: {
        ...(patch.status ? { status: patch.status as any } : {}),
        ...(patch.output !== undefined ? { output: patch.output as any } : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
      },
    });
  }

  /**
   * Persist a durable pause.
   *
   * A `task` wait becomes a WorkflowTask (work addressed to a person); a `timer` or `condition`
   * wait becomes a WorkflowTimer, which the clock service fires. Until the timer row existed those
   * two were dropped here, and every live run that hit a Wait step stayed WAITING forever (C1).
   *
   * The assignee is resolved to concrete user ids HERE, at creation, rather than being matched at
   * read time. That makes "my tasks" one indexed lookup, and it freezes who was actually asked —
   * a later change to the role's membership does not silently move somebody's work.
   */
  async recordWait(wait: PulseWaitRecord): Promise<void> {
    if (wait.kind === 'timer' || wait.kind === 'condition') {
      await this.recordClockWait(wait);
      return;
    }
    if (wait.kind !== 'task') return; // 'approval' is a legacy kind nothing hosts

    const cfg = wait.config as {
      title?: string;
      instructions?: string;
      assignee?: unknown;
      form?: unknown;
      dueAt?: string | null;
      onOverdue?: string;
    };
    const spec = String(cfg.assignee ?? '').trim();
    const ids = await this.resolveAssignees(spec, wait.organizationId, undefined);

    await (this.prisma as any).workflowTask.create({
      data: {
        runId: wait.runId,
        workflowId: wait.workflowId,
        organizationId: wait.organizationId,
        nodeId: wait.nodeId,
        title: String(cfg.title ?? ''),
        instructions: cfg.instructions ? String(cfg.instructions) : undefined,
        assigneeSpec: spec,
        // A spec that resolves to nobody is kept as an unassigned OPEN task rather than dropped.
        // The run is parked either way; a task nobody can see would make that invisible, and an
        // admin can still find it and reassign.
        assigneeUserIds: ids.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
        form: (cfg.form ?? undefined) as any,
        dueAt: cfg.dueAt ? new Date(cfg.dueAt) : undefined,
        onOverdue: String(cfg.onOverdue ?? 'continue'),
      },
    });
  }

  /**
   * A timer or condition wait as one WorkflowTimer row. The tenant is the run's, stamped
   * explicitly: the interpreter may be running from a sweep with no request context.
   *
   * An unreadable "until" throws on purpose — the interpreter records the wait before it parks,
   * so the step fails visibly instead of the run parking with nothing to wake it.
   */
  private async recordClockWait(wait: PulseWaitRecord): Promise<void> {
    const cfg = wait.config as ClockWaitConfig;
    const data: Record<string, unknown> = {
      runId: wait.runId,
      workflowId: wait.workflowId,
      organizationId: wait.organizationId,
      nodeId: wait.nodeId,
      kind: wait.kind,
    };
    if (wait.kind === 'timer') {
      data.dueAt = waitTimerDueAt(cfg);
    } else {
      // A record watch is stored in the same column, marked "watch:" (a legacy condition is a
      // {{expression}}, which never starts that way): the clock re-reads the record each sweep.
      data.condition = cfg.watch ? WATCH_PREFIX + JSON.stringify(cfg.watch) : String(cfg.condition ?? '');
      data.timeoutAt = cfg.deadline ? new Date(cfg.deadline) : undefined;
      // What the clock does when timeoutAt passes: timeout | continue | fail.
      data.branch = String(cfg.onTimeout ?? 'timeout');
    }
    await (this.prisma as any).workflowTimer.create({ data });
  }
}

/** A Wait sleeping in a test: Skip ends it ('skipped'), Stop rejects it. */
type TestWaiter = { done: (how?: 'elapsed' | 'skipped') => void; fail: (e: Error) => void };

/** Marks a WorkflowTimer.condition that holds a record watch (JSON), not an expression. */
export const WATCH_PREFIX = 'watch:';

/** The wait config time.wait emits (wait.executor.ts), by mode. */
interface ClockWaitConfig {
  durationMs?: unknown; // mode = duration
  until?: unknown; // mode = until
  condition?: string; // mode = condition, saved before the record watch (an expression)
  watch?: { entity: string; id: unknown; logic: string; rules: unknown[]; as: string }; // mode = condition
  deadline?: string; // mode = condition — ISO
  onTimeout?: string; // mode = condition — timeout | continue | fail
}

interface RunContext {
  organizationId?: number;
  /** The user who triggered the workflow — App API calls authenticate as them. */
  actorUserId?: string;
  ownerId?: unknown;
  entityName?: string;
  /**
   * The run's shared AI spend ceiling (plan 3.9). ONE object per run, held by reference, so every
   * agent call anywhere in the graph — inside a loop, on a parallel branch, inside a sub-workflow —
   * draws down the same allowance. Optional only so a caller that runs no agents need not make one.
   */
  budget?: RunAgentBudget;
}

/**
 * Executes PULSE workflows on the live trigger path. Mirrors the legacy runner:
 * matches a workflow's pulse trigger to the entity event, then runs it on the
 * PulseInterpreter with PRODUCTION services (real Prisma repo, SMTP email,
 * queued in-app notifications, outbound HTTP) and a durable Prisma run store.
 */
@Injectable()
export class PulseWorkflowRunner {
  private readonly logger = new Logger(PulseWorkflowRunner.name);
  private readonly registry: PulseRegistry = buildPulseRegistry();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly gateway: WorkflowGateway,
    private readonly aiSettings: AiSettingsService,
    private readonly grounding: GroundingService,
    private readonly agentRuns: AgentRunStore,
    private readonly mail: MailService,
  ) {}

  private triggerNode(wf: any): any {
    return (wf?.definition?.nodes ?? []).find((n: any) => n.kind === 'trigger');
  }

  /** A pulse workflow is one whose trigger uses the pulse trigger namespace. */
  isPulseWorkflow(wf: any): boolean {
    const t = this.triggerNode(wf)?.type;
    return typeof t === 'string' && t.startsWith('trigger.');
  }

  /** Does this pulse workflow's trigger fire for the given raw entity event? */
  matches(wf: any, event: string, data: any): boolean {
    const trig = this.triggerNode(wf);
    switch (trig?.type) {
      case 'trigger.recordCreated':
        return event === 'onCreate' && this.triggerRulesHold(trig.config, data, false);
      case 'trigger.recordUpdated':
        // Updates only. ("Also fire on create" was removed: a workflow that should run when a
        // record is created uses On Record Created.)
        return event === 'onUpdate' && this.triggerRulesHold(trig.config, data, true);
      case 'trigger.recordDeleted':
        return event === 'onDelete' && this.triggerRulesHold(trig.config, data, false);
      default:
        // trigger.scheduled / trigger.webhook / trigger.manualStart are not entity-event driven:
        // the clock service, the webhook controller and the start service call execute() on the
        // specific workflow directly, so they never need to match here.
        return false;
    }
  }

  /**
   * Trigger-level filter: (updates only) fire only when one of `watchFields` changed,
   * AND the record matches the `rules` value filter (field · operator · value, combined
   * by `logic` all/any). This is the entry-condition builder that replaces a redundant
   * gateway node right after the trigger. Empty watchFields + empty rules = always.
   */
  private triggerRulesHold(config: any, data: any, isUpdate: boolean): boolean {
    if (isUpdate && !matchesWatchFields(config, data?._changedFields)) return false;
    const rules = Array.isArray(config?.rules) ? config.rules : [];
    return matchesRules({ rules, logic: config?.logic ?? 'AND' }, (data ?? {}) as Record<string, unknown>);
  }

  /**
   * The entity-event entry point: every create / update / delete in the app
   * arrives here, and this is what makes PULSE the engine that actually runs.
   *
   * G12 — run-level deduplication. Two updates 50ms apart (batch jobs, webhook
   * replays, a double-clicked button) used to spawn two runs, producing duplicate
   * emails, duplicate records and duplicate approvals. Suppressed within a short
   * window keyed by workflow + record + event.
   *
   * Fire-and-forget by contract: a workflow failure must never fail the user's
   * write. Failures are logged, and each run's own status is recorded.
   */
  async onEntityEvent(entityName: string, event: string, data: any): Promise<void> {
    // PG-05 — execution order is DEFINED, not incidental.
    //
    // Several workflows can be registered on the same entity and event, and the
    // order used to be whatever the database returned. That is fine until two of
    // them touch the same record, at which point the outcome depends on row
    // order. Oldest-first is deterministic, explainable, and stable as workflows
    // are added: a new workflow never reorders the existing ones.
    const workflows = await this.prisma.workflow.findMany({
      where: { entityName, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    const matching = workflows.filter((wf) => this.isPulseWorkflow(wf) && this.matches(wf, event, data));
    if (matching.length === 0) return;

    const recordId = data?.id ?? data?.recordId ?? '';
    // Fan-out is logged with the order, so an unexpected interaction between two
    // workflows is diagnosable from the log rather than by guesswork.
    this.logger.log(
      `${event} on ${entityName}: ${matching.length} workflow(s) will run in order — ` +
        matching.map((w, i) => `${i + 1}. ${w.name}`).join(', '),
    );

    for (const wf of matching) {
      if (this.isDuplicate(wf.id, recordId, event)) {
        this.logger.debug(
          `Skipping duplicate trigger for workflow ${wf.id} on ${entityName}#${recordId} ` +
            `(within ${PulseWorkflowRunner.DEDUP_WINDOW_MS}ms)`,
        );
        continue;
      }
      try {
        await this.execute(wf, event, data);
      } catch (err: any) {
        // Never propagate: a broken workflow must not break the write that fired it.
        this.logger.error(`Workflow ${wf.id} failed on ${entityName}.${event}: ${err?.message}`);
      }
    }
  }

  /**
   * In-memory dedup window. Adequate for a single instance; a distributed
   * deployment should back this with the shared Redis the notification queue
   * already uses.
   */
  private static readonly DEDUP_WINDOW_MS = 2000;
  private readonly recentRuns = new Map<string, number>();

  private isDuplicate(workflowId: string, recordId: unknown, event: string): boolean {
    const key = `${workflowId}:${String(recordId)}:${event}`;
    const now = Date.now();
    const last = this.recentRuns.get(key);
    if (last !== undefined && now - last < PulseWorkflowRunner.DEDUP_WINDOW_MS) return true;

    this.recentRuns.set(key, now);
    // Bounded: never let the map grow without limit.
    if (this.recentRuns.size > 10_000) {
      const cutoff = now - PulseWorkflowRunner.DEDUP_WINDOW_MS * 2;
      for (const [k, ts] of this.recentRuns) if (ts < cutoff) this.recentRuns.delete(k);
    }
    return false;
  }

  /** Run a matched pulse workflow. Returns the final run status. */
  async execute(wf: any, event: string, data: any): Promise<{ status: string; runId: string }> {
    const tenant = getTenantContext();
    const organizationId = tenant?.organizationId;
    // The user who triggered this workflow — its own App API calls run AS them, so
    // the workflow can never do more than the user who set it off could (least
    // privilege) and the audit trail stays accurate. User-less triggers (scheduled /
    // webhook / system) have no userId and fall back to the org admin.
    const actorUserId = tenant?.userId;
    const variables = this.toVariables(data, event, wf.entityName);
    const startedAt = new Date();
    const store = new PrismaPulseRunStore(this.prisma, event, data, (spec, org, owner) =>
      this.resolveNotifyUserIds(spec, org, owner),
    );
    // One budget per run, made here and nowhere else on this path, so that every agent call the
    // graph makes — however deeply nested — draws on the same allowance (plan 3.9).
    const services = this.buildServices({
      organizationId,
      actorUserId,
      ownerId: variables.ownerId,
      entityName: wf.entityName,
      budget: createRunAgentBudget(),
    });
    const engine = new PulseInterpreter(this.registry, store, services);
    const run = await engine.execute({
      runId: randomUUID(),
      workflowId: wf.id,
      organizationId,
      definition: wf.definition,
      variables,
      definitionVersion: versionOf(wf),
    });
    // Every run, with its steps, is in WorkflowRun / WorkflowRunStep (Runs & Incidents). The separate
    // WorkflowExecution summary table this used to write was a retired, editable duplicate of that.
    return { status: run.status, runId: run.id };
  }

  /** The variables a run with this trigger data starts with — what the designer's Simulate shows. */
  triggerVariables(data: unknown): Record<string, unknown> {
    const vars = this.toVariables(data);
    for (const k of Object.keys(vars)) if (k.startsWith('$')) delete vars[k];
    return vars;
  }

  // ── trigger data → workflow variables ──────────────────────────────────────
  // Intentionally a pure pass-through: it just seeds the variable bag from the
  // triggering record. NO domain resolution happens here — owner/contact lookups
  // are explicit `data.readRecord` steps ON the workflow graph (e.g. "Load Owner"
  // → {{owner.email}}), so the runtime stays app-agnostic and every value a node
  // uses is visible on the canvas rather than injected invisibly by the runner.
  private toVariables(data: any, event?: string, entityName?: string): Record<string, unknown> {
    // Same shape as a manual start and a designer test run (workflow-start.rules seedVariables):
    // the record's fields flat AND the whole record under `record`. Live runs used to be flat only,
    // so `{{record.amount}}` passed Test and failed the moment the real trigger fired.
    const seeded = seedVariables(data && typeof data === 'object' ? data : {}, undefined);
    if (data && Array.isArray(data._changedFields)) seeded.changedFields = data._changedFields;
    if (data && data._previous && typeof data._previous === 'object') seeded.previous = data._previous;
    // Reserved ($) context for steps that act on "the record this run is about" — a notification
    // links to it by default, but not after a delete, when there is no record left to open.
    if (event) seeded.$trigger = event;
    if (entityName) seeded.$entity = entityName;
    return seeded;
  }

  // ── production services ────────────────────────────────────────────────────
  private buildServices(ctx: RunContext): PulseServices {
    return {
      repo: (entity: string) => {
        const d = () => (this.prisma as any)[delegateName(entity)];
        return {
          create: (data) => d().create({ data: coerceIdentifiers(data) }),
          findUnique: (where) => d().findFirst({ where: coerceWhere(where) }),
          findMany: (args) => d().findMany(args),
          count: (args) => d().count(args),
          update: (where, data) => d().update({ where: coerceWhere(where), data: coerceIdentifiers(data) }),
          delete: (where) => d().delete({ where: coerceWhere(where) }),
          // Straight through to the database. The whole reason these exist as repository methods
          // is to aggregate where the rows are, rather than shipping them here to be counted.
          groupBy: (args) => d().groupBy(args),
          aggregate: (args) => d().aggregate(args),
        };
      },
      log: (level, message) => {
        const fn = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'debug' ? 'debug' : 'log';
        (this.logger as any)[fn](message);
      },
      sendEmail: (email) => this.sendEmail(email, ctx),
      notify: (n) => this.notify(n, ctx),
      // The invitation a Create User Account step sends in invite mode. Delegated to the SAME plain
      // helper the Users page's "Send invite" button uses, so there is one implementation of "kill
      // the old links, write the new one, send it".
      // A Connector step. The runtime decrypts the connection itself; the run's variables never hold it.
      connector: (req) => runConnectorAction(this.prisma, process.env.JWT_SECRET || '', req),
      invite: async ({ userId, email }) =>
        issueInvite({
          userId,
          email,
          appName: process.env.APP_NAME || 'This app',
          baseUrl: publicBaseUrl(process.env),
          tokens: (this.prisma as any).authSetupToken,
          mail: this.mail,
        }),
      /**
       * Run another workflow as a step of this one (Call Workflow pulse).
       *
       * The sub-workflow runs on the SAME engine with its own run record, so it
       * appears in run history as a first-class run rather than disappearing
       * inside its caller. Depth is enforced here as well as in the executor —
       * the service is the last line of defence against a recursive definition.
       */
      runWorkflow: async ({ workflowId, workflowName, variables, depth, convertTypes }) => {
        if (depth > 5) {
          throw new Error(`Sub-workflow nesting exceeded 5 levels ("${workflowName ?? workflowId}").`);
        }
        // A workflow that starts "When Called by Another Workflow" is called whatever its status,
        // as in n8n: it never fires on its own, so activating it means nothing. One that starts
        // any other way (the older Manual Start pattern) must still be active.
        const candidates = workflowId
          ? await this.prisma.workflow.findMany({ where: { id: workflowId } })
          : await this.prisma.workflow.findMany({ where: { name: workflowName }, orderBy: { updatedAt: 'desc' } });
        const startOf = (wf: any) =>
          ((wf?.definition?.nodes ?? []) as any[]).find((n) => typeof n?.type === 'string' && n.type.startsWith('trigger.'));
        const target =
          candidates.find((wf: any) => startOf(wf)?.type === CALLED_BY_WORKFLOW) ??
          candidates.find((wf: any) => wf.status === 'ACTIVE');
        if (!target) {
          throw new Error(
            candidates.length
              ? `Workflow "${workflowName ?? workflowId}" is not active. Start it with "When Called by Another Workflow" (it then runs without activating), or activate it.`
              : `No workflow named "${workflowName ?? workflowId}".`,
          );
        }

        // Declared inputs: exactly those, typed (core/workflow-inputs). A wrong type fails THIS
        // step, naming the input, before the called workflow runs anything.
        let runVariables = variables;
        let triggerData: Record<string, unknown> = variables;
        const start = startOf(target);
        if (start?.type === CALLED_BY_WORKFLOW) {
          const shaped = shapeWorkflowInputs(declaredWorkflowInputs(start.config), variables, { convert: !!convertTypes });
          if (!shaped.ok) throw new Error(`Workflow "${(target as any).name}": ${shaped.message}`);
          triggerData = { input: shaped.input };
          runVariables = { input: shaped.input, $workflowDepth: (variables as any)?.$workflowDepth ?? depth };
        }

        const store = new PrismaPulseRunStore(this.prisma, 'subWorkflow', triggerData, (spec, org, owner) =>
          this.resolveNotifyUserIds(spec, org, owner),
        );
        const services = this.buildServices({
          organizationId: ctx.organizationId,
          actorUserId: ctx.actorUserId,
          ownerId: (variables as any)?.ownerId,
          entityName: (target as any).entityName,
          // The PARENT's budget, by reference — not a new one. A sub-workflow is part of the run
          // that called it, and giving it its own allowance would mean six budgets at the permitted
          // nesting depth of five, which is exactly the multiplication plan 3.9 exists to stop.
          budget: ctx.budget,
        });
        const engine = new PulseInterpreter(this.registry, store, services);
        const run = await engine.execute({
          runId: randomUUID(),
          workflowId: target.id,
          organizationId: ctx.organizationId,
          definition: (target as any).definition,
          variables: runVariables,
          definitionVersion: versionOf(target),
        });
        return { status: run.status, runId: run.id, variables: run.variables };
      },
      http: async (req: PulseHttpRequest) => {
        let url = req.url;
        const headers: Record<string, string> = { ...(req.headers ?? {}) };
        // A relative path is a call to THIS app's own API (the Call App API pulse).
        // Route it to the loopback address and authenticate it as the tenant's
        // Organisation Admin, so it passes the same auth/permission/tenant stack.
        if (url.startsWith('/')) {
          const base = process.env.SELF_BASE_URL || `http://127.0.0.1:${process.env.BACKEND_PORT || '3000'}`;
          url = base + url;
          const token = await this.internalToken(ctx.organizationId, ctx.actorUserId);
          if (token) headers['Authorization'] = `Bearer ${token}`;
          headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        }
        // The body is sent as JSON, so say so unless the step set its own type: without it most
        // APIs (Nest included) read no body at all and answer 400.
        // GET and HEAD carry no body (fetch refuses one): a Body left on the step is ignored.
        const sendsBody = req.body != null && !/^(GET|HEAD)$/i.test(req.method || 'GET');
        if (sendsBody && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
          headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(url, {
          method: req.method,
          headers,
          body: sendsBody ? JSON.stringify(req.body) : undefined,
        });
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* keep raw text */
        }
        return { status: res.status, data: parsed };
      },
      agent: (req: PulseAgentRequest) => this.runAgentStep(req, ctx),
    };
  }

  /**
   * Run a configured Agent as a workflow step (plan 3.3).
   *
   * Identity first, because everything else is derived from it. The agent works under ONE
   * person's permissions and can only ever see less than they can; the grounding pack and the
   * tools are both built from that person, so an entity removed there is not merely hidden from
   * the prompt, it is unreachable.
   */
  private async runAgentStep(req: PulseAgentRequest, ctx: RunContext): Promise<PulseAgentResult> {
    // Loaded through the ONE definition of a named agent, shared with the ask route.
    const agent = await loadNamedAgent(this.prisma, { agentId: req.agentId, agentName: req.agentName });

    // DECISION B. An agent runs as the person the designer named, falling back to whoever
    // triggered the workflow. With neither, it FAILS — it does not fall back to the agent's own
    // allowedEntities, which is a ceiling and would become a grant the moment it were used that
    // way, handing a scheduled run access nobody approved.
    const actingUserId = req.runAs ?? ctx.actorUserId;
    if (!actingUserId) {
      throw new AgentStepError(
        'NoActingUser',
        'This workflow was not started by a person, so the agent has no permissions to work ' +
          'under. Set "Run as" on the AI Agent step to the user it should act for.',
      );
    }
    const principal = await this.resolvePrincipal(actingUserId);
    if (!principal) {
      throw new AgentStepError(
        'NoActingUser',
        `User ${actingUserId} does not exist (deleted?), so the agent has no permissions to ` +
          `work under. Point "Run as" at a current user.`,
      );
    }

    const cfg = await this.aiSettings.getConfig();
    if (!cfg.configured) {
      throw new AgentStepError(
        'AgentNotConfigured',
        'No AI provider is configured. An administrator can set one on the AI Provider page.',
      );
    }

    // The run-wide ceiling (plan 3.9), checked BEFORE anything is spent and after the cheap
    // refusals above — an unconfigured or misnamed agent should say so, not report a budget.
    //
    // Nothing else in this method bounds how many times it is CALLED. `maxIterations` below caps
    // one call's round-trips; a `forEach` over 500 records calls this 500 times regardless.
    const verdict = ctx.budget?.check() ?? ({ allowed: true } as const);
    if (!verdict.allowed) {
      throw new AgentStepError(
        'AgentBudgetExhausted',
        `Agent "${agent.name}" was not run because ${verdict.reason}. Raise the limit, or handle ` +
          `"AgentBudgetExhausted" on an error branch from this step.`,
      );
    }

    // Instructions, tool ceiling, entity ceiling, model override, iteration cap and output
    // instruction — computed by the same function the ask route uses, so a page and a workflow
    // step can never disagree about what this agent may do.
    const prepared = await prepareNamedAgent({
      prisma: this.prisma,
      grounding: this.grounding,
      cfg,
      agent,
      principal: { id: principal.id, email: principal.email, permissions: principal.permissions },
      task: req.task,
      organizationId: ctx.organizationId,
      maxIterations: req.maxIterations,
      webSearch: req.webSearch,
      // Wave D — a schema set on the STEP replaces the row's for this call only.
      outputSchema: req.outputSchema,
    });
    const startedAt = Date.now();
    const who = { ...prepared.who, surface: 'pulse', startedAt };

    // Counted here, not after the call returns. A call that throws must still count, or an agent
    // step that fails on every pass of a loop would repeat without limit.
    ctx.budget?.admit();

    let result;
    try {
      result = await runAgent(prepared.cfg, prepared.options);
    } catch (err) {
      await this.agentRuns.record({ ...who, error: (err as Error).message });
      throw err;
    }

    ctx.budget?.spend(result.usage);

    await this.agentRuns.record({
      ...who,
      answer: result.answer,
      iterations: result.iterations,
      stoppedEarly: result.stoppedEarly,
      usage: result.usage,
      invocations: result.invocations,
    });

    return {
      answer: result.answer,
      result: parseAgentOutput(result.answer, req.outputSchema ?? agent.outputSchema, agent.name),
      toolsUsed: result.invocations.map((i) => i.name),
      usage: result.usage ? { ...result.usage, calls: result.iterations } : undefined,
    };
  }

  /**
   * Resolve the person an agent acts as: their id, email and permission map.
   *
   * Deliberately has NO "any user with a role" fallback, unlike `internalToken`. There, falling
   * back keeps an internal API call working; here it would silently run the agent as a stranger.
   */
  private async resolvePrincipal(
    userId: string,
  ): Promise<{ id: number; email?: string; permissions: Record<string, any> } | null> {
    const user: any = await this.prisma.user.findFirst({
      where: { id: Number(userId) },
      select: { id: true, email: true, roleId: true },
    });
    if (!user) return null;

    // Read via roleId rather than the User->role relation: the relation field name is
    // schema-dependent, which is the same reason `internalToken` below does it this way.
    const role =
      user.roleId != null
        ? await (this.prisma as any).rolesAndPermissions.findFirst({
            where: { id: user.roleId },
            select: { entityPermissions: true },
          })
        : null;
    const raw = role?.entityPermissions;
    const permissions =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          })()
        : (raw ?? {});
    return { id: user.id, email: user.email, permissions };
  }

  // ── Designer test runs ────────────────────────────────────────────────────
  //
  // Test step and Test flow run FOR REAL, as n8n's and Activepieces' do (2026-10-12): records are
  // created, changed and deleted and stay that way; email, in-app notifications and invitations
  // are delivered; HTTP calls and called workflows really run; the AI Agent really answers. A test
  // used to run inside a rolled-back transaction with some side effects real (email,
  // notifications) and others faked (HTTP, sub-workflows) — a mix nobody could predict, and the
  // transaction hid bugs a real run would hit.
  //
  // What stays test-only is how a run is DRIVEN, not what it does: a Wait passes straight
  // through, a User Task completes with the answers typed in the Test dialog, and a {{variable}}
  // nothing provides fails the step instead of becoming blank.

  /** The real services, with log lines also kept for the designer (Test step's Console). */
  /**
   * Test flows started in the background (Test in the designer): who started each, its result once
   * done, and the Wait steps it is sleeping on — so Skip wait / Stop reach the right promise.
   * In memory on purpose: a test belongs to the designer's open editor, not to the database.
   */
  private readonly backgroundTests = new Map<
    string,
    { owner: string; result?: unknown; cancelled?: boolean; waits: Set<TestWaiter> }
  >();

  /** Start a Test flow without holding the request: steps stream live, the result arrives as test.done. */
  startTestFlow(
    definition: any,
    variablesIn: Record<string, unknown>,
    runId: string | undefined,
    opts: {
      taskAnswers?: Record<string, Record<string, unknown>>;
      entityName?: string;
      /** Called with the finished result, e.g. to keep it as the workflow's last test. */
      onDone?: (result: unknown) => void;
    } = {},
  ): { runId: string; status: 'running' } {
    const ctx = this.testContext();
    const rid = runId || `test-${randomUUID()}`;
    const owner = String(ctx.actorUserId ?? '');
    const entry = { owner, waits: new Set<TestWaiter>() } as {
      owner: string; result?: unknown; cancelled?: boolean; waits: Set<TestWaiter>;
    };
    this.backgroundTests.set(rid, entry);
    const finish = (result: unknown) => {
      entry.result = result;
      try {
        opts.onDone?.(result);
      } catch {
        /* keeping the last test is a convenience; it never breaks the result */
      }
      try {
        if (ctx.actorUserId != null) this.gateway.pushToUser(ctx.actorUserId, 'test.done', { runId: rid, result });
        else if (ctx.organizationId != null) this.gateway.pushToOrg(ctx.organizationId, 'test.done', { runId: rid, result });
      } catch {
        /* the designer also polls for the result */
      }
      // Kept a while for the poll, then dropped.
      setTimeout(() => this.backgroundTests.delete(rid), 30 * 60_000).unref?.();
    };
    this.runTestFlow(definition, variablesIn, rid, opts).then(finish, (e) =>
      finish({ status: 'failed', error: e instanceof Error ? e.message : String(e), steps: [] }),
    );
    return { runId: rid, status: 'running' };
  }

  /** The caller's own background test: its result, or still running. Null when it is not theirs. */
  testFlowResult(runId: string): { status: 'running' } | { status: 'done'; result: unknown } | null {
    const entry = this.ownTest(runId);
    if (!entry) return null;
    return entry.result !== undefined ? { status: 'done', result: entry.result } : { status: 'running' };
  }

  /** Skip wait: every Wait the test is sleeping on ends now, and the run carries on. */
  skipTestWait(runId: string): boolean {
    const entry = this.ownTest(runId);
    if (!entry) return false;
    for (const w of [...entry.waits]) w.done('skipped');
    return true;
  }

  /** Stop: the test ends at the Wait it is on (or the next one), so nothing after it runs. */
  cancelTestFlow(runId: string): boolean {
    const entry = this.ownTest(runId);
    if (!entry) return false;
    entry.cancelled = true;
    const stopped = Object.assign(new Error('The test was stopped.'), { name: 'TestStopped' });
    for (const w of [...entry.waits]) w.fail(stopped);
    return true;
  }

  private ownTest(runId: string) {
    const entry = this.backgroundTests.get(runId);
    const me = String(getTenantContext()?.userId ?? '');
    return entry && entry.owner === me ? entry : null;
  }

  private buildTestServices(
    ctx: RunContext,
    cap: TestCaptures,
    /** A Test flow: its Wait steps really sleep, can be skipped / stopped, and say when they end. */
    flow?: { runId: string; onWait: (until: number, label?: string) => void },
  ): PulseServices {
    const real = this.buildServices(ctx);
    const entry = flow ? this.backgroundTests.get(flow.runId) : undefined;
    return {
      ...real,
      ...(flow
        ? {
            testWait: (ms: number, show?: { until: number; label?: string }) =>
              new Promise<'elapsed' | 'skipped'>((resolve, reject) => {
                if (entry?.cancelled) return reject(Object.assign(new Error('The test was stopped.'), { name: 'TestStopped' }));
                flow.onWait(show?.until ?? Date.now() + ms, show?.label);
                const w: TestWaiter = {
                  done: (how = 'elapsed') => {
                    clearTimeout(timer);
                    entry?.waits.delete(w);
                    resolve(how);
                  },
                  fail: (e: Error) => {
                    clearTimeout(timer);
                    entry?.waits.delete(w);
                    reject(e);
                  },
                };
                const timer = setTimeout(() => w.done(), ms);
                entry?.waits.add(w);
              }),
          }
        : {}),
      log: (level, message) => {
        cap.logs.push({ level, message });
        real.log(level, message);
      },
      notify: async (n) => {
        cap.notifications.push(n);
        return this.notify(n, ctx);
      },
    };
  }

  /** Tenant context for a test, from the current request (drives email recipients). */
  private testContext(): RunContext {
    const tenant = getTenantContext();
    return {
      organizationId: tenant?.organizationId,
      actorUserId: tenant?.userId,
      // A test run gets its own budget on the same terms as a real one. The agent step runs for
      // REAL here (see the note above), so a designer clicking Test on a loop over a table spends
      // real money — the one place where the cap matters most, because it is the place someone
      // discovers what their workflow costs.
      budget: createRunAgentBudget(),
    };
  }

  /** Run one pulse for real (Test step). */
  async runTestPulse(
    pulseType: string,
    config: Record<string, unknown>,
    variablesIn: Record<string, unknown>,
    /** Given by the designer: a Wait tested on its own can then be skipped / stopped (test-runs routes). */
    runId?: string,
  ) {
    const variables = seedTestVariables(variablesIn);
    const pulse = this.registry.get(pulseType);
    if (!pulse) throw new Error(`Unknown pulse "${pulseType}"`);
    const ctx = this.testContext();
    const cap: TestCaptures = { emails: [], notifications: [], http: [], logs: [] };
    let out: Record<string, unknown> | undefined;
    if (runId) this.backgroundTests.set(runId, { owner: String(ctx.actorUserId ?? ''), waits: new Set<TestWaiter>() });
    try {
      const services = this.buildTestServices(ctx, cap, runId ? { runId, onWait: () => {} } : undefined);
      const pctx: PulseContext = {
        variables,
        scopeId: 'scope:root',
        services,
        run: { id: 'test-node', workflowId: 'test' },
        isTest: true,
      };
      const outcome = await runPulse(pulse, { id: 'test', config, runtime: {} }, pctx);
      // A step that returns a named error (Run JavaScript's "line 3: …") failed, even though
      // the wrapper completed: Test step says so instead of showing an empty success.
      const named = outcome.result?.error;
      out = {
        status: named ? 'failed' : outcome.status,
        variables: outcome.variables,
        output: outcome.result?.outputs ?? {},
        result: outcome.result ?? null,
        error: outcome.error?.message ?? named?.message ?? null,
      };
    } catch (e) {
      // A genuine failure (e.g. a constraint violation on a write) — exactly what a test shows.
      out = { status: 'failed', variables, output: {}, result: null, error: e instanceof Error ? e.message : String(e) };
    } finally {
      if (runId) this.backgroundTests.delete(runId);
    }
    return { ...(out ?? {}), logs: cap.logs, emails: cap.emails, notifications: cap.notifications };
  }

  /** Run a whole pulse definition for real (Test flow).
   *
   * When a runId is supplied, each node's lifecycle is streamed over the workflow
   * websocket as it actually executes (`test.step` events tagged with the runId),
   * so the designer canvas can light up nodes LIVE — not as a post-hoc replay. The
   * HTTP response still returns the full step list as the authoritative record. */
  async runTestFlow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition: any,
    variablesIn: Record<string, unknown>,
    runId?: string,
    opts: { taskAnswers?: Record<string, Record<string, unknown>>; entityName?: string } = {},
  ) {
    // The test starts with exactly what a real run of this trigger starts with: one builder
    // (core/trigger-input) shapes the input for live runs, Test flow and Simulate alike, from the
    // trigger's own declaration — a webhook gets a call, a schedule a tick, a sign-up the submitted
    // details, a record trigger its row. Never a table row where a real run has none.
    const trigger = ((definition?.nodes ?? []) as any[]).find((n) => typeof n?.type === 'string' && n.type.startsWith('trigger.'));
    const spec = trigger ? this.registry.get(trigger.type)?.meta.triggerInput : undefined;
    const preSeeded = !!variablesIn && typeof variablesIn === 'object' && 'record' in variablesIn;
    let variables: Record<string, unknown>;
    if (spec && !(spec.source === 'record' && preSeeded)) {
      variables = this.toVariables(buildTriggerInput(spec, trigger.config, variablesIn, { type: trigger.type, test: true }));
    } else {
      // Variables already in run shape (a start with extra variables): kept as given.
      variables = seedTestVariables(variablesIn);
      if (trigger?.type === 'trigger.recordUpdated') {
        if (variables.previous === undefined) variables.previous = variables.record;
        if (variables.changedFields === undefined) variables.changedFields = [];
      }
    }
    // What the run STARTED with: the trigger's output, so the designer can offer it to every step.
    const startInput = Object.fromEntries(Object.entries(variables).filter(([k]) => !k.startsWith('$')));
    // Wave D — the answers the Test dialog collected for each User Task, keyed by node id. The
    // task executor reads its own entry in test mode, so the approve path is testable. Reserved
    // (`$`-prefixed) like $queue, and stripped from the returned variables below.
    if (opts.taskAnswers && typeof opts.taskAnswers === 'object') variables.$testAnswers = opts.taskAnswers;
    if (opts.entityName) variables.$entity = opts.entityName;
    const ctx = this.testContext();
    const rid = runId || `test-${randomUUID()}`;
    const cap: TestCaptures = { emails: [], notifications: [], http: [], logs: [] };
    // Stream per-node progress live over the workflow gateway (best-effort; a
    // failed emit never breaks the run). Scoped to the designer who launched the
    // test: these events carry real record data in their outputs, so
    // they must never reach another user — or another tenant — via a broadcast.
    const emit = (phase: string, nodeId: string, extra?: Record<string, unknown>) => {
      try {
        const evt = { runId: rid, nodeId, phase, ...(extra || {}) };
        if (ctx.actorUserId != null) this.gateway.pushToUser(ctx.actorUserId, 'test.step', evt);
        else if (ctx.organizationId != null) this.gateway.pushToOrg(ctx.organizationId, 'test.step', evt);
      } catch {
        /* websocket is a convenience — the HTTP result is authoritative */
      }
    };
    // The step a Wait's countdown belongs to: the one that started last.
    let current = '';
    const liveHooks = {
      onStart: (nodeId: string) => {
        current = nodeId;
        emit('running', nodeId);
      },
      onEnd: (nodeId: string, result: { outputs?: Record<string, unknown> }) =>
        emit('success', nodeId, { output: result?.outputs ?? {} }),
      onSkip: (nodeId: string) => emit('skipped', nodeId),
      onArrive: (nodeId: string, arrived: number, needed: number) => emit('arrived', nodeId, { arrived, needed }),
      onError: (nodeId: string, err: Error) => emit('error', nodeId, { error: err?.message }),
    };
    let out: Record<string, unknown> | undefined;
    const store = new InMemoryPulseRunStore();
    try {
      // Started in the background (the designer): Waits really sleep, skippable. Held as one
      // request instead: the Wait step keeps its own one-minute limit.
      const services = this.buildTestServices(
        ctx,
        cap,
        this.backgroundTests.has(rid)
          ? { runId: rid, onWait: (until, label) => emit('waiting', current, { until, ...(label ? { label } : {}) }) }
          : undefined,
      );
      const engine = new PulseInterpreter(this.registry, store, services, liveHooks);
      const run = await engine.execute({
        runId: rid,
        workflowId: 'test',
        organizationId: ctx.organizationId,
        definition,
        variables,
        isTest: true,
      });
      const { $testAnswers: _answers, $entity: _entity, ...cleanVariables } = run.variables;
      out = {
        status: run.status,
        variables: cleanVariables,
        input: startInput,
        error: run.error ?? null,
        steps: store.steps,
        usage: summarizeAgentUsage(store.steps),
      };
    } catch (e) {
      const { $testAnswers: _answers, $entity: _entity, ...cleanVariables } = variables;
      out = { status: 'failed', variables: cleanVariables, input: startInput, steps: store.steps, error: e instanceof Error ? e.message : String(e) };
    }
    return { ...(out ?? {}), logs: cap.logs, emails: cap.emails, notifications: cap.notifications };
  }

  /**
   * Sign a short-lived JWT so a workflow's internal Call App API request
   * authenticates against the app's own stack (TenantMiddleware + AuthGuard +
   * permission guards), scoped to the tenant. It authenticates AS the triggering
   * user (least privilege + accurate audit); for user-less triggers (scheduled /
   * webhook / system) it falls back to the tenant's Organisation Admin.
   */
  private async internalToken(org?: number, actorUserId?: string): Promise<string | null> {
    if (!org) return null;
    // Resolved WITHOUT traversing the User->role relation: the relation field name
    // is schema-dependent (a project may call it "role", "rolesandpermissions",
    // or anything else), so the engine reads roleId and looks the role up
    // separately. "roleId" and "entityPermissions" are standardized-model fields
    // the generator relies on elsewhere too.
    const select = { id: true, email: true, roleId: true };

    // Prefer the user who triggered the workflow (scoped to this org).
    let actor: any = actorUserId
      ? await this.prisma.user.findFirst({ where: { id: Number(actorUserId) }, select })
      : null;
    // Fallback: any user in the tenant that carries a role.
    if (!actor) {
      actor = await this.prisma.user.findFirst({
        where: { organizationId: org, NOT: { roleId: null } },
        select,
      });
    }
    if (!actor) {
      this.logger.warn(`No principal for internal API call in org ${org} — request will be unauthenticated.`);
      return null;
    }

    const role = actor.roleId != null
      ? await (this.prisma as any).rolesAndPermissions.findFirst({
          where: { id: actor.roleId },
          select: { entityPermissions: true },
        })
      : null;
    const raw = role?.entityPermissions;
    const permissions =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          })()
        : raw ?? {};
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { payload: { userId: actor.id, email: actor.email, roleId: actor.roleId, permissions, organizationId: org, isPlatformAdmin: false } },
      process.env.JWT_SECRET,
      { expiresIn: '5m' },
    );
  }

  private async emailsForRole(roleName: string, org?: number): Promise<string[]> {
    try {
      const roles: any[] = await (this.prisma as any).rolesAndPermissions.findMany({ where: { role: roleName }, select: { id: true } });
      const roleIds = roles.map((r) => r.id);
      if (!roleIds.length) return [];
      const users = await this.prisma.user.findMany({
        where: { roleId: { in: roleIds }, ...(org ? { organizationId: org } : {}) },
        select: { email: true },
      });
      return users.map((u) => u.email).filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  /**
   * PG-06 — resolve an email recipient spec.
   *
   * Accepts the SAME vocabulary as the in-app notification resolver: `role:<Role>`,
   * a literal address, a numeric user id, and `owner` for the record's owner. The
   * two used to differ — email understood only roles and literal addresses — so a
   * recipient that worked on a notification silently resolved to nobody on an
   * email. Every lookup is scoped to the acting tenant.
   */
  private async resolveRecipients(toRaw: string, org?: number, ownerId?: unknown): Promise<string> {
    const raw = String(toRaw ?? '').trim();
    const out = new Set<string>();

    // A blank recipient means the record's owner, matching the notification pulse.
    if (!raw) {
      const email = await this.emailForUserId(ownerId, org);
      if (email) out.add(email);
      return [...out].join(',');
    }

    for (const part of raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
      const role = /^role:\s*(.+)$/i.exec(part);
      if (role) {
        (await this.emailsForRole(role[1].trim(), org)).forEach((e) => out.add(e));
      } else if (/^owner$/i.test(part)) {
        const email = await this.emailForUserId(ownerId, org);
        if (email) out.add(email);
      } else if (part.includes('@')) {
        out.add(part);
      } else if (/^\d+$/.test(part)) {
        const email = await this.emailForUserId(part, org);
        if (email) out.add(email);
      }
    }
    return [...out].join(',');
  }

  /** A single user's email, tenant-scoped. */
  private async emailForUserId(userId: unknown, org?: number): Promise<string | null> {
    if (userId == null || userId === '') return null;
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: Number(userId), ...(org ? { organizationId: org } : {}) },
        select: { email: true },
      });
      return (user?.email as string) ?? null;
    } catch {
      return null;
    }
  }

  private async sendEmail(
    email: PulseEmail,
    ctx: RunContext,
  ): Promise<{ sent: boolean; via: string }> {
    const to = await this.resolveRecipients(email.to, ctx.organizationId, ctx.ownerId);
    if (!to) {
      // G5 — a recipient that resolves to nothing is a misconfiguration, not a
      // successful send. Fail the step so it is visible in run history.
      throw new Error(
        `sendEmail: no resolvable recipient for "${email.subject}" (to: ${String(email.to ?? '')})`,
      );
    }
    // The node's OWN SMTP still wins, exactly as before: a workflow somebody set up with its own
    // connector keeps using it. Everything else now goes through the app's mail settings — one page,
    // one transport, and the SMTP password encrypted at rest instead of sitting in a node's config.
    const nodeSmtp = email.smtp
      ? {
          host: email.smtp.host,
          port: email.smtp.port,
          secure: email.smtp.secure,
          user: email.smtp.user,
          pass: email.smtp.pass,
        }
      : null;

    // The authored body in the app's email layout. MailService embeds the logo (cid) on send.
    const { html, text } = renderAppEmail({
      subject: email.subject,
      bodyHtml: email.html ?? '',
      cta: email.cta && email.cta.url ? email.cta : null,
    });

    try {
      const result = await this.mail.send(
        {
          to,
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          html,
          text,
          ...(email.from ? { from: email.from } : {}),
        },
        nodeSmtp,
      );
      if (!result.sent) {
        // No transport configured (dev / preview). Reported honestly rather than as a send, because
        // downstream nodes must not act on mail that never went out.
        this.logger.log(`[email:no-smtp] "${email.subject}" → ${to}`);
      }
      return { sent: result.sent, via: result.sent ? 'smtp' : result.via };
    } catch (err: any) {
      // G5 — this used to log a warning and return normally, so the executor
      // reported sent:true for mail that never left. Throw so the step records
      // FAILED and the run history shows it.
      this.logger.error(`Pulse email send failed: ${err?.message}`);
      throw new Error(`sendEmail failed for "${to}": ${err?.message}`);
    }
  }

  private async notify(n: PulseNotification, ctx: RunContext): Promise<{ recipients: number }> {
    // A run with no organization is platform-level: started by a platform administrator (an
    // account outside every organization) or on a platform-owned record. It notifies PLATFORM
    // users only, never people inside the tenants, and the notification carries no
    // organization, which is exactly what a platform user's inbox reads back. It used to fail the
    // step instead, so a platform admin could never receive a workflow notification at all.
    const organizationId = ctx.organizationId ?? null;
    const userIds =
      organizationId == null
        ? await this.platformUsersOnly(await this.resolveNotifyUserIds(n.to, undefined, ctx.ownerId))
        : await this.resolveNotifyUserIds(n.to, organizationId, ctx.ownerId);
    if (!userIds.length) {
      this.logger.warn(`Pulse notification "${n.title}" has no resolvable recipient — skipped.`);
      return { recipients: 0 };
    }
    for (const userId of userIds) {
      await this.notificationQueue.enqueue({
        userId,
        title: n.title,
        message: n.message,
        entityName: n.entity ?? ctx.entityName,
        entityRecordId: n.entityId != null && String(n.entityId).trim() !== '' ? String(n.entityId).trim() : undefined,
        organizationId,
      });
    }
    return { recipients: userIds.length };
  }

  /** Keep only the users who belong to no organization (the platform's own accounts). */
  private async platformUsersOnly(userIds: string[]): Promise<string[]> {
    const ids = userIds.map(Number).filter((id) => Number.isInteger(id));
    if (!ids.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, organizationId: null },
      select: { id: true },
    });
    return users.map((u) => String(u.id));
  }

  /**
   * Resolve a notification recipient spec to a deduped list of user ids. Supports a
   * comma/semicolon-separated MIX of `role:<Role>` tokens (every user holding that
   * role in the org), plain emails, numeric user ids, and — when the whole spec is
   * blank — the record owner. Mirrors the email recipient resolver so a node can
   * notify several roles at once.
   */
  private async resolveNotifyUserIds(to: string | undefined, org?: number, ownerId?: unknown): Promise<string[]> {
    const raw = String(to ?? '').trim();
    if (!raw) return ownerId != null ? [String(ownerId)] : [];
    const out = new Set<string>();
    for (const part of raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
      const role = /^role:\s*(.+)$/i.exec(part);
      if (role) {
        (await this.userIdsForRole(role[1].trim(), org)).forEach((id) => out.add(id));
      } else if (/^\d+$/.test(part)) {
        out.add(part);
      } else if (part.includes('@')) {
        const u = await this.prisma.user.findFirst({ where: { email: part }, select: { id: true } });
        if (u) out.add(String(u.id));
      }
    }
    return [...out];
  }

  /**
   * Continue a run that is parked on a human step.
   *
   * This is the caller `PulseInterpreter.resume()` never had. Until it existed the engine could
   * park a run on a User Task and nothing in the app could ever unpark it, so every non-test run
   * containing one stayed WAITING forever.
   *
   * `branch` is 'completed' for a finished task and 'overdue' for an escalation, matching the
   * edges the User Task pulse declares.
   *
   * KNOWN GAP, deliberate: the AI spend budget (plan 3.9) is a fresh allowance on resume, because
   * it lives in memory for the duration of one call and a task may be completed days later by a
   * different process. A loop of wait -> agent therefore gets its ceiling back on each pass. The
   * same caveat is recorded against the BullMQ scheduler; whoever persists the budget must cover
   * both paths.
   */
  async resumeTask(
    task: {
      runId: string;
      workflowId: string;
      nodeId: string;
      organizationId?: number | null;
    },
    branch: 'completed' | 'overdue',
    outputs: Record<string, unknown>,
    actorUserId?: string,
  ): Promise<{ status: string; runId: string }> {
    const wf: any = await (this.prisma as any).workflow.findUnique({
      where: { id: task.workflowId },
    });
    if (!wf?.definition) {
      throw new Error(`resumeTask: workflow ${task.workflowId} has no definition`);
    }

    const organizationId = task.organizationId ?? undefined;
    const store = new PrismaPulseRunStore(this.prisma, 'taskCompleted', outputs, (spec, org, owner) =>
      this.resolveNotifyUserIds(spec, org, owner),
    );
    const services = this.buildServices({
      organizationId,
      actorUserId,
      entityName: wf.entityName,
      budget: createRunAgentBudget(),
    });
    const engine = new PulseInterpreter(this.registry, store, services);
    const definition = await this.definitionForRun(wf, task.runId);
    const run = await engine.resume(definition, task.runId, task.nodeId, { branch, outputs });
    return { status: run.status, runId: run.id };
  }

  /**
   * Continue a run parked on a Wait step (timer or condition), called by the clock service once
   * it has claimed the WorkflowTimer row. Mirrors resumeTask.
   *
   * `branch` is null for a plain continuation — the timer elapsed, the condition came true, or
   * the deadline passed with onTimeout = 'continue' — and the interpreter then follows the wait's
   * unlabelled edges only. It is 'timeout' for a condition whose deadline passed with the default
   * setting. No person is involved, so there is no acting user: an AI Agent step after the wait
   * fails with NoActingUser unless "Run as" is set on it (Decision B). Same fresh-budget caveat
   * as resumeTask.
   */
  async resumeTimer(
    timer: {
      runId: string;
      workflowId: string;
      nodeId: string;
      organizationId?: number | null;
    },
    branch: string | null,
    /** A record wait that was met: the record as it is now, under the step's "Store the record as". */
    outputs?: Record<string, unknown>,
  ): Promise<{ status: string; runId: string }> {
    const wf: any = await (this.prisma as any).workflow.findUnique({
      where: { id: timer.workflowId },
    });
    if (!wf?.definition) {
      throw new Error(`resumeTimer: workflow ${timer.workflowId} has no definition`);
    }

    const organizationId = timer.organizationId ?? undefined;
    const store = new PrismaPulseRunStore(this.prisma, 'timerFired', { branch }, (spec, org, owner) =>
      this.resolveNotifyUserIds(spec, org, owner),
    );
    const services = this.buildServices({
      organizationId,
      entityName: wf.entityName,
      budget: createRunAgentBudget(),
    });
    const engine = new PulseInterpreter(this.registry, store, services);
    const definition = await this.definitionForRun(wf, timer.runId);
    const run = await engine.resume(definition, timer.runId, timer.nodeId, { branch, ...(outputs ? { outputs } : {}) });
    return { status: run.status, runId: run.id };
  }

  /**
   * The record a "Wait until a record meets conditions" step watches, as it is now. Called by the
   * clock inside the run's tenant, so another organization's record reads as missing.
   */
  async readWatchedRecord(entity: string, id: unknown): Promise<Record<string, unknown> | null> {
    const delegate = (this.prisma as any)[delegateName(entity)];
    if (!delegate) return null;
    return delegate.findFirst({ where: coerceWhere({ id }) });
  }

  /**
   * The definition a parked run continues on: the WorkflowVersion snapshot it started with
   * (WorkflowRun.definitionVersion, stamped by execute). The live definition is used only when
   * the run predates pinning or the snapshot is missing — logged, because that is exactly the
   * case where a graph edited while a task sat open can send the run somewhere new.
   */
  private async definitionForRun(wf: any, runId: string): Promise<any> {
    const row: any = await (this.prisma as any).workflowRun.findUnique({
      where: { id: runId },
      select: { definitionVersion: true },
    });
    const pinned = row?.definitionVersion;
    if (pinned == null) {
      this.logger.warn(`Run ${runId} carries no definition version (started before pinning); resuming on the current definition.`);
      return wf.definition;
    }
    if (pinned === versionOf(wf)) return wf.definition;
    const snapshot: any = await (this.prisma as any).workflowVersion.findFirst({
      where: { workflowId: wf.id, version: pinned },
      select: { definition: true },
    });
    if (!snapshot?.definition) {
      this.logger.warn(`Run ${runId} was started on version ${pinned} of workflow ${wf.id}, but that snapshot is gone; resuming on version ${String(versionOf(wf))}.`);
      return wf.definition;
    }
    return snapshot.definition;
  }

  /**
   * Stop a run from outside: the run row goes CANCELLED (compare-and-set on a live status, so
   * a finished run is refused rather than rewritten), its PENDING timers and OPEN tasks are
   * CANCELLED so the clock and the task list stop offering them. No step is replayed or undone.
   * A walk that is still in flight finishes its current node; the store's saveRun will not
   * overwrite the CANCELLED status afterwards.
   */
  async cancelRun(runId: string): Promise<{ status: string; runId: string; timers: number; tasks: number }> {
    const claimed = await this.prisma.workflowRun.updateMany({
      where: { id: runId, status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] as any } },
      data: { status: 'CANCELLED' as any, error: 'Cancelled', completedAt: new Date() },
    });
    if (claimed.count === 0) {
      const row: any = await this.prisma.workflowRun.findUnique({ where: { id: runId }, select: { status: true } });
      throw new Error(
        row ? `cancelRun: run ${runId} is already ${String(row.status).toLowerCase()}` : `cancelRun: run ${runId} not found`,
      );
    }
    const timers = await (this.prisma as any).workflowTimer.updateMany({
      where: { runId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    const tasks = await (this.prisma as any).workflowTask.updateMany({
      where: { runId, status: 'OPEN' },
      data: { status: 'CANCELLED' },
    });
    return { status: 'CANCELLED', runId, timers: timers.count, tasks: tasks.count };
  }

  /**
   * Withdraw a task from the outside (task console). The task row is already CANCELLED by the
   * caller; this decides what the parked run does about it. If the task node has an `error` edge
   * the run continues down it with `variables.error = { name: 'TaskCancelled', ... }`, so the
   * designer's handler decides (reassign, notify, end). With no handler the run FAILS with
   * TaskCancelled — legibly, rather than waiting forever for a task nobody will complete.
   *
   * Goes through the interpreter's resume, so its guard applies: a run that has already moved
   * on (an ESCALATED task whose overdue branch ran) is left alone and reported as it is.
   */
  async cancelTask(
    task: { id: string; runId: string; workflowId: string; nodeId: string; organizationId?: number | null },
    actorUserId?: string,
  ): Promise<{ status: string; runId: string }> {
    const message = `Task ${task.id} was cancelled${actorUserId ? ` by user ${actorUserId}` : ''}.`;
    // The row keeps a WAITING run as PAUSED, with the node it parked at inside `context` (see
    // PrismaPulseRunStore.getRun) — there is no pausedAtNodeId column.
    const row: any = await this.prisma.workflowRun.findUnique({
      where: { id: task.runId },
      select: { status: true, context: true },
    });
    if (!row) throw new Error(`cancelTask: run ${task.runId} not found`);
    const pausedAt = (row.context as { pausedAtNodeId?: string } | null)?.pausedAtNodeId;
    if (row.status !== 'PAUSED' || pausedAt !== task.nodeId) {
      return { status: String(row.status), runId: task.runId };
    }
    const wf: any = await (this.prisma as any).workflow.findUnique({ where: { id: task.workflowId } });
    if (!wf?.definition) throw new Error(`cancelTask: workflow ${task.workflowId} has no definition`);
    const definition = await this.definitionForRun(wf, task.runId);
    const edges: any[] = Array.isArray(definition?.edges) ? definition.edges : [];
    const hasErrorEdge = edges.some((e) => e?.from === task.nodeId && e?.condition === 'error');
    if (!hasErrorEdge) {
      return this.failParkedRun({ runId: task.runId, nodeId: task.nodeId }, `TaskCancelled: ${message}`, 'human.userTask');
    }
    const store = new PrismaPulseRunStore(this.prisma, 'taskCancelled', {}, (spec, org, owner) =>
      this.resolveNotifyUserIds(spec, org, owner),
    );
    const services = this.buildServices({
      organizationId: task.organizationId ?? undefined,
      actorUserId,
      entityName: wf.entityName,
      budget: createRunAgentBudget(),
    });
    const engine = new PulseInterpreter(this.registry, store, services);
    const run = await engine.resume(definition, task.runId, task.nodeId, {
      branch: 'error',
      variables: { error: { name: 'TaskCancelled', message, nodeId: task.nodeId } },
    });
    return { status: run.status, runId: run.id };
  }

  /**
   * Fail a parked run from the outside — a condition wait whose deadline passed with
   * onTimeout = 'fail'. Written straight to the run tables in the same shape the store uses,
   * so run history shows the step and the reason.
   */
  async failParkedRun(
    timer: { runId: string; nodeId: string },
    message: string,
    nodeType = 'time.wait',
  ): Promise<{ status: string; runId: string }> {
    // The parked step is WAITING; settle THAT row rather than adding a second one. A run failed
    // from outside before any step parked there (no WAITING row) still gets its FAILED step.
    const settled = await this.prisma.workflowRunStep.updateMany({
      where: { runId: timer.runId, nodeId: timer.nodeId, status: 'WAITING' as any },
      data: { status: 'FAILED' as any, error: message },
    });
    if (!settled.count) {
      await this.prisma.workflowRunStep.create({
        data: { runId: timer.runId, nodeId: timer.nodeId, nodeKind: 'pulse', nodeType, status: 'FAILED' as any, error: message },
      });
    }
    await this.prisma.workflowRun.update({
      where: { id: timer.runId },
      data: { status: 'FAILED' as any, error: message, completedAt: new Date() },
    });
    return { status: 'FAILED', runId: timer.runId };
  }

  /**
   * User ids of everyone holding `roleName`, scoped to the org. Public: the task console reassigns
   * by role. Matched trimmed and case-insensitively — the same rule activation applies
   * (assignee-rules.ts), so a role that passes activation is the role that resolves here.
   */
  async userIdsForRole(roleName: string, org?: number): Promise<string[]> {
    try {
      const roles: any[] = await (this.prisma as any).rolesAndPermissions.findMany({
        where: { role: { equals: String(roleName ?? '').trim(), mode: 'insensitive' } },
        select: { id: true },
      });
      const roleIds = roles.map((r) => r.id);
      if (!roleIds.length) return [];
      const users = await this.prisma.user.findMany({
        where: { roleId: { in: roleIds }, ...(org ? { organizationId: org } : {}) },
        select: { id: true },
      });
      return users.map((u) => String(u.id));
    } catch {
      return [];
    }
  }
}

/** The workflow's current version number, or undefined for a row without one. */
function versionOf(wf: unknown): number | undefined {
  const v = (wf as { version?: unknown } | null)?.version;
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * A test run gets the SAME variable shape a real manual start seeds (workflow-start.rules):
 * the trigger record's fields flat AND the whole record under `record`. Before this, the
 * designer's sample data was passed flat only, so `{{record.amount}}` — the form every guide and
 * the AI use for a start "from a record" — resolved to nothing in a test and the gateway failed
 * with 'Invalid condition "> 100000"' while the very same workflow ran fine for real.
 */
export function seedTestVariables(variables: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!variables || typeof variables !== 'object') return {};
  if ('record' in variables) return variables;
  return seedVariables(variables, undefined);
}
