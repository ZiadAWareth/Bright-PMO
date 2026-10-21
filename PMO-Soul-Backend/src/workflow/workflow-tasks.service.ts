import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ConflictException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PulseWorkflowRunner } from './pulses/services/pulse-live-runner';
import { displayName, matchesAssignee } from './workflow-tasks.rules';
import { runWithTenant } from '../organization-scope/tenant-context';
import { getTenantContext } from '../organization-scope/tenant-context';

/** How often overdue tasks are swept. One timer for the app, not one per task. */
const OVERDUE_SWEEP_MS = 60_000;

@Injectable()
export class WorkflowTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowTasksService.name);
  private sweepTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PulseWorkflowRunner,
  ) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      this.sweepOverdue().catch((err) =>
        this.logger.error('Overdue task sweep failed: ' + (err?.message ?? err)),
      );
    }, OVERDUE_SWEEP_MS);
    // Never hold the process open for a timer.
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** Tasks addressed to this user. Newest first; open ones are what the inbox shows. */
  async listMine(userId: string, status?: string, limit?: number) {
    const take = Math.min(Number(limit) > 0 ? Number(limit) : 50, 200);
    const uid = Number(userId);
    if (!Number.isFinite(uid)) return [];
    return (this.prisma as any).workflowTask.findMany({
      where: {
        assigneeUserIds: { has: uid },
        ...(status ? { status: status as any } : { status: 'OPEN' as any }),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take,
    });
  }

  /** One task, only if it is addressed to this user. */
  async getMine(id: string, userId: string) {
    const uid = Number(userId);
    const task = await (this.prisma as any).workflowTask.findUnique({ where: { id } });
    // Same response for "does not exist" and "not yours": a different error would let a user
    // enumerate which task ids are real.
    if (!task || !Number.isFinite(uid) || !(task.assigneeUserIds ?? []).includes(uid)) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  // ─── Task console (Wave D) — admin routes, gated on Workflow update in the controller ───

  /** Every task the tenant can see, newest first, with the assignees' names resolved. */
  async listAdmin(filters: { status?: string; workflowId?: string; assignee?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.workflowId) where.workflowId = /^\d+$/.test(filters.workflowId) ? Number(filters.workflowId) : filters.workflowId;
    const rows: any[] = await (this.prisma as any).workflowTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const workflowIds = [...new Set(rows.map((r) => r.workflowId))];
    const userIds = [...new Set(rows.flatMap((r) => r.assigneeUserIds ?? []))];
    const [workflows, users] = await Promise.all([
      workflowIds.length
        ? (this.prisma as any).workflow.findMany({ where: { id: { in: workflowIds } }, select: { id: true, name: true } })
        : [],
      userIds.length ? (this.prisma as any).user.findMany({ where: { id: { in: userIds } } }) : [],
    ]);
    const nameOf = new Map<number, string>((users as any[]).map((u) => [Number(u.id), displayName(u)]));
    const workflowName = new Map<unknown, string>((workflows as any[]).map((w) => [w.id, w.name]));
    const items = rows
      .map((r) => ({
        ...r,
        workflowName: workflowName.get(r.workflowId) ?? null,
        assigneeNames: (r.assigneeUserIds ?? []).map((id: number) => nameOf.get(Number(id)) ?? String(id)),
      }))
      .filter((r) => matchesAssignee(r, filters.assignee));
    return { items, total: items.length };
  }

  /** Point an open task at other people: explicit user ids, or everyone holding a role. */
  async reassign(id: string, target: { userIds?: number[]; role?: string }) {
    const task = await this.openTask(id);
    let ids = (target.userIds ?? []).map(Number).filter((n) => Number.isFinite(n));
    if (target.role) {
      // Same resolver the runner uses for `role:<Name>` when the task is created.
      const org = getTenantContext()?.organizationId ?? task.organizationId ?? undefined;
      ids = ids.concat((await this.runner.userIdsForRole(String(target.role).trim(), org)).map(Number));
    }
    ids = [...new Set(ids)];
    if (!ids.length) throw new BadRequestException('Nobody to assign to: give user ids or a role with members.');
    return (this.prisma as any).workflowTask.update({
      where: { id },
      data: {
        assigneeUserIds: ids,
        ...(target.role ? { assigneeSpec: 'role:' + String(target.role).trim() } : {}),
      },
    });
  }

  /** Add the caller to an open task's assignees. */
  async claim(id: string, userId: string) {
    const task = await this.openTask(id);
    const uid = Number(userId);
    if (!Number.isFinite(uid)) throw new BadRequestException('No user to claim as.');
    const current: number[] = task.assigneeUserIds ?? [];
    if (current.includes(uid)) return task;
    return (this.prisma as any).workflowTask.update({
      where: { id },
      data: { assigneeUserIds: [...current, uid] },
    });
  }

  /**
   * Withdraw a task. The row flips CANCELLED (compare-and-set, like completion) and the runner
   * decides what the parked run does: its `error` edge with TaskCancelled, or FAILED when the
   * node has none. A run left WAITING for a task nobody will finish is the one outcome refused.
   */
  async cancel(id: string, userId: string) {
    const task = await this.openTask(id);
    const claimed = await (this.prisma as any).workflowTask.updateMany({
      where: { id, status: { in: ['OPEN', 'ESCALATED'] as any } },
      data: { status: 'CANCELLED' as any, completedAt: new Date() },
    });
    if (claimed.count === 0) throw new ConflictException('Task is no longer open.');
    const run = await this.runner.cancelTask(task, userId);
    return { ...task, status: 'CANCELLED', run };
  }

  /** A task the console may still act on: OPEN or ESCALATED. 404 unknown, 409 otherwise. */
  private async openTask(id: string) {
    const task = await (this.prisma as any).workflowTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'OPEN' && task.status !== 'ESCALATED') {
      throw new ConflictException(`Task is already ${String(task.status).toLowerCase()}.`);
    }
    return task;
  }

  /**
   * Complete a task and let its run continue down the `completed` branch.
   *
   * The status flip is a COMPARE-AND-SET (`updateMany` filtered on OPEN) rather than a read then
   * a write. Two clicks on a slow connection would otherwise both find the task open and resume
   * the same run twice — and a workflow step can send an email or charge a card.
   */
  async complete(id: string, userId: string, formData: Record<string, unknown>) {
    const task = await this.getMine(id, userId);
    if (task.status !== 'OPEN') {
      throw new BadRequestException(`Task is already ${String(task.status).toLowerCase()}.`);
    }

    const claimed = await (this.prisma as any).workflowTask.updateMany({
      where: { id, status: 'OPEN' as any },
      data: {
        status: 'COMPLETED' as any,
        formData: (formData ?? {}) as any,
        completedById: Number(userId),
        completedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Task was already completed.');
    }

    return this.resumeOrRollBack(task, 'completed', {
      completedBy: String(userId),
      formData: formData ?? {},
    }, userId);
  }

  /**
   * Resume the parked run, putting the task back if the engine refuses it.
   *
   * Without the rollback a workflow edited while the task sat open — the node deleted, say —
   * would leave the task marked done and the run parked forever, which is the exact failure this
   * whole surface exists to remove, just one step further along.
   */
  private async resumeOrRollBack(
    task: any,
    branch: 'completed' | 'overdue',
    outputs: Record<string, unknown>,
    actorUserId?: string,
  ) {
    try {
      const result = await this.runner.resumeTask(task, branch, outputs, actorUserId);
      return { taskId: task.id, ...result };
    } catch (err: any) {
      await (this.prisma as any).workflowTask.update({
        where: { id: task.id },
        data: { status: 'OPEN' as any, completedById: null, completedAt: null },
      });
      this.logger.error(
        `Task ${task.id} could not resume run ${task.runId}: ${err?.message ?? err}`,
      );
      throw new BadRequestException(
        'This task could not be submitted because its workflow has changed. It has been left open.',
      );
    }
  }

  /**
   * Move overdue tasks down the `overdue` branch.
   *
   * Only tasks whose author asked for escalation are touched: `onOverdue: 'continue'` means keep
   * waiting, and a deadline is not by itself permission to route around the person.
   *
   * The compare-and-set is what makes this safe with more than one replica — both may find the
   * same row, only one `updateMany` reports a count of 1, and only that one resumes the run.
   */
  private async sweepOverdue(): Promise<void> {
    const due = await (this.prisma as any).workflowTask.findMany({
      where: {
        status: 'OPEN' as any,
        onOverdue: 'escalate',
        dueAt: { not: null, lt: new Date() },
      },
      take: 100,
    });

    for (const task of due) {
      const claimed = await (this.prisma as any).workflowTask.updateMany({
        where: { id: task.id, status: 'OPEN' as any },
        data: { status: 'ESCALATED' as any, completedAt: new Date() },
      });
      if (claimed.count === 0) continue;

      try {
        // The sweep runs from a timer, not a request, so there is no tenant on the async context.
        // Without one the Prisma middleware passes writes through unscoped: rows created on the
        // overdue branch landed with organizationId NULL and updates-by-id could hit another
        // tenant's row. Resume inside the task's own tenant.
        await runWithTenant(
          { organizationId: task.organizationId ?? undefined },
          () => this.runner.resumeTask(task, 'overdue', { completedBy: null, formData: {} }),
        );
      } catch (err: any) {
        await (this.prisma as any).workflowTask.update({
          where: { id: task.id },
          data: { status: 'OPEN' as any, completedAt: null },
        });
        this.logger.error(
          `Overdue task ${task.id} could not escalate run ${task.runId}: ${err?.message ?? err}`,
        );
      }
    }
  }
}
