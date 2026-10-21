import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PulseWorkflowRunner, WATCH_PREFIX } from './pulses/services/pulse-live-runner';
import { runWithTenant } from '../organization-scope/tenant-context';
import { buildTriggerInput, evaluate, matchesRules } from './pulses/core';
import { meta as scheduledMeta } from './pulses/catalog/triggers/scheduled/scheduled.pulse';
import {
  clockProblems,
  nextRunAt,
  scheduledTrigger,
  webhookTrigger,
  DEFAULT_TIMEZONE,
  WAIT_CONTINUE_ACTION,
  WAIT_TIMEOUT_BRANCH,
} from './clock-rules';

/**
 * How often parked waits and due schedules are swept. One timer per process; the work is
 * claimed row by row with a compare-and-set, so several replicas can all run it.
 * Tunable with WORKFLOW_CLOCK_SWEEP_MS (floor 5 s).
 */
const CLOCK_SWEEP_MS = Math.max(5_000, Number(process.env.WORKFLOW_CLOCK_SWEEP_MS) || 30_000);

/** Rows handled per sweep per table. A backlog drains over successive sweeps. */
const SWEEP_BATCH = 100;

/**
 * A RUNNING run with no step activity for this long is taken to be interrupted (the process
 * died mid-walk) and marked FAILED. Tunable with WORKFLOW_STUCK_RUN_MINUTES (default 30, floor 1);
 * raise it for workflows whose single steps legitimately run longer.
 */
const STUCK_RUN_MS = Math.max(1, Number(process.env.WORKFLOW_STUCK_RUN_MINUTES) || 30) * 60_000;

/**
 * A task COMPLETED at least this long ago whose run is still parked on it is re-resumed. The
 * grace keeps the sweep from racing the HTTP completion that is resuming the very same run.
 */
const TASK_RECONCILE_GRACE_MS = 2 * 60_000;

/**
 * The clock behind time.wait and trigger.scheduled.
 *
 * WHY THIS EXISTS
 * A timer or condition wait used to be dropped at the pause — only human tasks were persisted —
 * so any run that hit one stayed WAITING forever. And trigger.scheduled had no scheduler behind
 * it at all: the pulse was in the catalogue with nothing to fire it.
 *
 * SHAPE
 * The same pattern as the overdue-task sweep in workflow-tasks.service.ts: rows in the database,
 * setInterval + unref, a compare-and-set before acting, every resume inside the row's own tenant.
 *
 * SCHEDULES ARE RECONCILED, NOT SYNCED
 * Each sweep derives the wanted set of schedules from the ACTIVE workflows carrying a scheduled
 * trigger and makes the WorkflowSchedule table match it. No create/update/delete hook in the
 * workflow service has to remember to keep it current, and a row that somehow went stale heals
 * on the next pass. The cost is one small query per sweep and up to one sweep of latency between
 * activation and the first tick.
 */
@Injectable()
export class WorkflowClockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowClockService.name);
  private sweepTimer?: ReturnType<typeof setInterval>;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PulseWorkflowRunner,
  ) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      this.sweep().catch((err) => this.logger.error('Workflow clock sweep failed: ' + (err?.message ?? err)));
    }, CLOCK_SWEEP_MS);
    // Never hold the process open for a timer.
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** One pass over everything the clock owns. Exposed so a test or an operator can call it. */
  async sweep(): Promise<void> {
    if (this.sweeping) return; // a slow pass must not stack up behind itself
    this.sweeping = true;
    try {
      await this.sweepTimers();
      await this.reconcileSchedules();
      await this.sweepSchedules();
      await this.sweepStuckRuns();
      await this.reconcileCompletedTasks();
    } finally {
      this.sweeping = false;
    }
  }

  // ── activation ───────────────────────────────────────────────────────────

  /**
   * What stops this definition going ACTIVE on the clock side. The pure checks (cron syntax,
   * time zone, webhook path shape) come from clock-rules; the one that needs the database —
   * a webhook path already taken by another ACTIVE workflow — is here.
   */
  async activationProblems(definition: unknown, excludeWorkflowId?: string): Promise<string[]> {
    const problems = clockProblems(definition);
    const hook = webhookTrigger(definition);
    if (hook && hook.path) {
      const others: any[] = await (this.prisma as any).workflow.findMany({
        where: { status: 'ACTIVE', ...(excludeWorkflowId ? { NOT: { id: excludeWorkflowId } } : {}) },
        select: { id: true, name: true, definition: true },
      });
      const clash = others.find((w) => webhookTrigger(w.definition)?.path === hook.path);
      if (clash) {
        problems.push(
          'Webhook trigger: path "' + hook.path + '" is already used by the active workflow "' +
            clash.name + '". Each active webhook path must be unique.',
        );
      }
    }
    return problems;
  }

  // ── timer / condition waits ──────────────────────────────────────────────

  /**
   * Fire the waits whose moment has come.
   *
   * A timer is due when dueAt has passed. A condition is looked at every sweep: it fires when
   * the expression holds against the run's current variables, takes its timeout behaviour when
   * the deadline has passed, and is otherwise left alone — untouched rows cost one read.
   */
  private async sweepTimers(): Promise<void> {
    const now = new Date();
    // Two bounded reads, not one: a backlog of conditions that are not yet true would otherwise
    // fill the batch every sweep and starve the timers behind them.
    const dueTimers: any[] = await (this.prisma as any).workflowTimer.findMany({
      where: { status: 'PENDING', kind: 'timer', dueAt: { lte: now } },
      orderBy: { dueAt: 'asc' },
      take: SWEEP_BATCH,
    });
    const conditions: any[] = await (this.prisma as any).workflowTimer.findMany({
      where: { status: 'PENDING', kind: 'condition' },
      orderBy: { createdAt: 'asc' },
      take: SWEEP_BATCH,
    });

    for (const timer of [...dueTimers, ...conditions]) {
      const decision = await this.decide(timer, now);
      if (!decision) continue;
      const action = decision.action;

      // Compare-and-set: with several replicas both may find the row; only one flips it.
      const claimed = await (this.prisma as any).workflowTimer.updateMany({
        where: { id: timer.id, status: 'PENDING' },
        data: { status: 'FIRED', firedAt: now },
      });
      if (claimed.count === 0) continue;

      try {
        // A timer fires from an interval, not a request: no tenant on the async context. Resume
        // inside the row's own tenant so every write the continuation makes is scoped.
        await runWithTenant({ organizationId: timer.organizationId ?? undefined }, async () => {
          if (action === 'fail') {
            await this.runner.failParkedRun(timer, decision.reason ?? 'Wait deadline passed for condition "' + timer.condition + '".');
          } else {
            // A plain continuation is an explicit null branch: the wait's unlabelled edges only.
            await this.runner.resumeTimer(timer, action === WAIT_CONTINUE_ACTION ? null : action, decision.outputs);
          }
        });
      } catch (err: any) {
        await (this.prisma as any).workflowTimer.update({
          where: { id: timer.id },
          data: { status: 'PENDING', firedAt: null },
        });
        this.logger.error('Timer ' + timer.id + ' could not resume run ' + timer.runId + ': ' + (err?.message ?? err));
      }
    }
  }

  /**
   * What a pending row should do now: WAIT_CONTINUE_ACTION to continue on the unlabelled edges,
   * 'timeout' to take the timeout branch, 'fail' to fail the run, or null to leave it parked.
   * A met record watch also hands the record on (outputs); a failure says why (reason).
   */
  private async decide(
    timer: any,
    now: Date,
  ): Promise<{ action: string; outputs?: Record<string, unknown>; reason?: string } | null> {
    if (timer.kind === 'timer') {
      return timer.dueAt && new Date(timer.dueAt) <= now ? { action: WAIT_CONTINUE_ACTION } : null;
    }
    if (timer.kind !== 'condition') return null;

    const condition = String(timer.condition ?? '');
    let holds = false;
    let outputs: Record<string, unknown> | undefined;
    let what = 'condition "' + condition + '"';
    if (condition.startsWith(WATCH_PREFIX)) {
      // "Until a record meets conditions": the record as it is NOW, read inside the run's tenant.
      let watch: any;
      try {
        watch = JSON.parse(condition.slice(WATCH_PREFIX.length));
      } catch {
        return { action: 'fail', reason: 'The wait could not be read; save the workflow again.' };
      }
      what = 'the ' + watch.entity + ' record #' + watch.id;
      const record = await runWithTenant({ organizationId: timer.organizationId ?? undefined }, () =>
        this.runner.readWatchedRecord(String(watch.entity), watch.id),
      );
      if (!record) return { action: 'fail', reason: 'Stopped waiting: ' + what + ' no longer exists.' };
      try {
        holds = matchesRules({ rules: watch.rules ?? [], logic: watch.logic }, record);
      } catch (err: any) {
        return { action: 'fail', reason: 'The conditions on ' + what + ' could not be checked: ' + (err?.message ?? err) };
      }
      if (holds) outputs = { [String(watch.as || 'watchedRecord')]: record };
    } else {
      try {
        const run: any = await (this.prisma as any).workflowRun.findUnique({
          where: { id: timer.runId },
          select: { context: true },
        });
        const variables = (run?.context as any)?.variables ?? {};
        holds = evaluate(condition, variables);
      } catch (err: any) {
        // An expression that cannot be evaluated will never become true; treat it as a deadline
        // miss rather than re-logging it every 30 seconds until the deadline anyway.
        this.logger.warn('Timer ' + timer.id + ': condition could not be evaluated (' + (err?.message ?? err) + ').');
        return { action: 'fail' };
      }
    }
    if (holds) return { action: WAIT_CONTINUE_ACTION, outputs };

    if (timer.timeoutAt && new Date(timer.timeoutAt) <= now) {
      const onTimeout = String(timer.branch ?? WAIT_TIMEOUT_BRANCH);
      if (onTimeout === 'fail') return { action: 'fail', reason: 'Gave up waiting: ' + what + ' did not meet the conditions in time.' };
      if (onTimeout === 'continue') return { action: WAIT_CONTINUE_ACTION };
      return { action: WAIT_TIMEOUT_BRANCH };
    }
    return null;
  }

  // ── recovery ─────────────────────────────────────────────────────────────

  /**
   * Runs the process lost mid-walk.
   *
   * A walk holds its state in memory; if the process stops, the row stays RUNNING with nothing
   * to finish it, indistinguishable from a run that is genuinely busy. A RUNNING run whose last
   * recorded step activity is older than STUCK_RUN_MS is marked FAILED with a plain message. No
   * step is replayed: a step that already sent an email must not be sent again by a sweep.
   */
  private async sweepStuckRuns(): Promise<void> {
    const cutoff = new Date(Date.now() - STUCK_RUN_MS);
    const candidates: any[] = await (this.prisma as any).workflowRun.findMany({
      where: { status: 'RUNNING', startedAt: { lt: cutoff } },
      select: { id: true },
      orderBy: { startedAt: 'asc' },
      take: SWEEP_BATCH,
    });
    for (const run of candidates) {
      // Recent step activity means a long run that is still alive: leave it.
      const recent = await (this.prisma as any).workflowRunStep.findFirst({
        where: { runId: run.id, executedAt: { gte: cutoff } },
        select: { id: true },
      });
      if (recent) continue;
      const claimed = await (this.prisma as any).workflowRun.updateMany({
        where: { id: run.id, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          error: 'Interrupted: the process stopped while this run was executing',
          completedAt: new Date(),
        },
      });
      if (claimed.count) this.logger.warn('Run ' + run.id + ' had no activity for ' + STUCK_RUN_MS / 60_000 + ' min and was marked FAILED.');
    }
  }

  /**
   * Tasks that were completed but whose run never moved on.
   *
   * complete() flips the task to COMPLETED and then resumes the run; a crash between the two
   * left the run parked on a task that no longer exists for anyone. Each sweep re-runs the
   * resume for a COMPLETED task (form data present) whose run is still parked on that node.
   * The interpreter's resume guard makes this idempotent: a run that has already moved on is
   * refused, not re-run.
   */
  private async reconcileCompletedTasks(): Promise<void> {
    const before = new Date(Date.now() - TASK_RECONCILE_GRACE_MS);
    const tasks: any[] = await (this.prisma as any).workflowTask.findMany({
      where: { status: 'COMPLETED', completedAt: { lt: before }, run: { status: 'PAUSED' } },
      include: { run: { select: { context: true } } },
      orderBy: { completedAt: 'asc' },
      take: SWEEP_BATCH,
    });
    for (const task of tasks) {
      if (task.formData == null) continue;
      if ((task.run?.context as any)?.pausedAtNodeId !== task.nodeId) continue;
      try {
        await runWithTenant({ organizationId: task.organizationId ?? undefined }, () =>
          this.runner.resumeTask(
            task,
            'completed',
            { completedBy: task.completedById != null ? String(task.completedById) : null, formData: task.formData ?? {} },
            task.completedById != null ? String(task.completedById) : undefined,
          ),
        );
        this.logger.warn('Task ' + task.id + ' was completed but its run ' + task.runId + ' had not resumed; resumed now.');
      } catch (err: any) {
        this.logger.error('Task ' + task.id + ' could not be reconciled with run ' + task.runId + ': ' + (err?.message ?? err));
      }
    }
  }

  // ── cron schedules ───────────────────────────────────────────────────────

  /** Make the WorkflowSchedule table match the ACTIVE workflows that carry a scheduled trigger. */
  private async reconcileSchedules(): Promise<void> {
    const now = new Date();
    const active: any[] = await (this.prisma as any).workflow.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, definition: true, organizationId: true },
    });
    const wanted = new Map<string, { cron: string; timezone: string; organizationId?: number | null }>();
    for (const wf of active) {
      const trig = scheduledTrigger(wf.definition);
      if (trig && trig.cron) wanted.set(wf.id, { cron: trig.cron, timezone: trig.timezone, organizationId: wf.organizationId });
    }

    const existing: any[] = await (this.prisma as any).workflowSchedule.findMany();
    for (const row of existing) {
      const want = wanted.get(row.workflowId);
      if (!want) {
        await (this.prisma as any).workflowSchedule.delete({ where: { id: row.id } }).catch(() => undefined);
        continue;
      }
      wanted.delete(row.workflowId);
      if (row.cron !== want.cron || (row.timezone ?? DEFAULT_TIMEZONE) !== want.timezone || !row.enabled) {
        const next = this.safeNext(want.cron, now, want.timezone, row.workflowId);
        await (this.prisma as any).workflowSchedule.update({
          where: { id: row.id },
          data: { cron: want.cron, timezone: want.timezone, nextRunAt: next ?? row.nextRunAt, enabled: next !== null },
        });
      }
    }

    for (const [workflowId, want] of wanted) {
      const next = this.safeNext(want.cron, now, want.timezone, workflowId);
      if (!next) continue; // activation should have refused it; logged by safeNext
      await (this.prisma as any).workflowSchedule.create({
        data: {
          workflowId,
          cron: want.cron,
          timezone: want.timezone,
          nextRunAt: next,
          enabled: true,
          organizationId: want.organizationId ?? undefined,
        },
      }).catch((err: any) => this.logger.warn('Schedule for workflow ' + workflowId + ' not created: ' + (err?.message ?? err)));
    }
  }

  private safeNext(cron: string, from: Date, timezone: string, workflowId: string): Date | null {
    try {
      const next = nextRunAt(cron, from, timezone);
      if (!next) this.logger.warn('Workflow ' + workflowId + ': schedule "' + cron + '" never fires; disabled.');
      return next;
    } catch (err: any) {
      this.logger.warn('Workflow ' + workflowId + ': schedule "' + cron + '" is invalid (' + (err?.message ?? err) + '); disabled.');
      return null;
    }
  }

  /**
   * Start every schedule that is due. The claim is a compare-and-set on nextRunAt: the row is
   * advanced to the following occurrence in the same statement that claims it, so a second
   * replica finding the same row sees a different nextRunAt and its update matches nothing.
   */
  private async sweepSchedules(): Promise<void> {
    const now = new Date();
    const due: any[] = await (this.prisma as any).workflowSchedule.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: SWEEP_BATCH,
    });

    for (const schedule of due) {
      const next = this.safeNext(schedule.cron, now, schedule.timezone ?? DEFAULT_TIMEZONE, schedule.workflowId);
      const claimed = await (this.prisma as any).workflowSchedule.updateMany({
        where: { id: schedule.id, nextRunAt: schedule.nextRunAt },
        data: { nextRunAt: next ?? schedule.nextRunAt, lastRunAt: now, enabled: next !== null },
      });
      if (claimed.count === 0) continue;

      // Re-read under no tenant: the reconcile runs without one too, so the row is authoritative.
      const wf: any = await (this.prisma as any).workflow.findFirst({
        where: { id: schedule.workflowId, status: 'ACTIVE' },
      });
      if (!wf) continue; // deactivated since the reconcile; the next reconcile removes the row

      try {
        // No person started this run. It carries the workflow's tenant so every row it writes is
        // scoped, and no acting user — an AI Agent step in it fails with NoActingUser unless the
        // designer set "Run as" on that step (Decision B).
        await runWithTenant({ organizationId: schedule.organizationId ?? wf.organizationId ?? undefined }, () =>
          // A tick, shaped by the trigger's declaration (pulses/core/trigger-input) like a test's.
          this.runner.execute(
            wf,
            'scheduled',
            buildTriggerInput(
              scheduledMeta.triggerInput!,
              { cron: schedule.cron, timezone: schedule.timezone ?? DEFAULT_TIMEZONE },
              { firedAt: now.toISOString() },
            ),
          ),
        );
      } catch (err: any) {
        // The occurrence is spent either way: a failing workflow must not be re-fired every sweep.
        this.logger.error('Scheduled workflow ' + wf.id + ' (' + wf.name + ') failed: ' + (err?.message ?? err));
      }
    }
  }
}
