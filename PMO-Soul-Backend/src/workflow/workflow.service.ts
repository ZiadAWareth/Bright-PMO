import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { lintConsent } from './consent-lint';
import { validateDefinition } from './graph-rules';
import { assigneeProblems } from './assignee-rules';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantContext } from '../organization-scope/tenant-context';

/** Who saved a version, for the version history: the signed-in person's email, else their id. */
function savedBy(): string | undefined {
  const t = getTenantContext();
  return t?.userEmail || t?.userId || undefined;
}

/** A stored version's steps. Older rows hold the whole save body as a JSON string. */
function versionDefinition(raw: unknown): any {
  let v: any = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (v && typeof v === 'object' && v.definition && typeof v.definition === 'object') v = v.definition;
  return v && typeof v === 'object' ? v : null;
}
import { PulseWorkflowRunner } from './pulses/services/pulse-live-runner';
import { WorkflowClockService } from './workflow-clock.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
// Operators come from the PULSE rule evaluator — the same list the engine
// executes, so the catalogue can never advertise one the engine lacks.
import { SUPPORTED_RULE_OPERATORS, RULE_OPERATOR_LABELS, acceptsErrorEdge } from './pulses/core';
import { buildPulseRegistry } from './pulses/catalog';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pulseRunner: PulseWorkflowRunner,
    private readonly clock: WorkflowClockService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────

  async findAll(filters?: { entityId?: string; status?: string }) {
    const where: any = {};
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        entityId: true,
        entityName: true,
        status: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        isPlatform: true,
        _count: { select: { runs: true } },
      },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        _count: { select: { runs: true, versions: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async create(dto: CreateWorkflowDto) {
    if (String((dto as any).status ?? '').toUpperCase() === 'ACTIVE') {
      await this.assertRunnable(dto.definition);
    }
    // G3: the workflow and its first version are one unit of work. If the second
    // write fails, the workflow is orphaned with no version history — rollback
    // breaks permanently and the version counter is wrong from then on.
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          name: dto.name,
          description: dto.description,
          entityId: dto.entityId,
          entityName: dto.entityName,
          definition: dto.definition,
          status: 'DRAFT',
          version: 1,
        },
      });

      // Save initial version
      await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          definition: dto.definition,
          createdBy: savedBy(),
        },
      });

      return workflow;
    });
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const existing = await this.findOne(id);
    const nextVersion = existing.version + 1;
    // The consent lint used to run only on activation; editing an ACTIVE workflow bypassed it, so
    // an agent → gateway pair could be added to a live flow and run with no person in between.
    if (dto.definition && String(existing.status).toUpperCase() === 'ACTIVE') {
      const problems = lintConsent(dto.definition as any);
      if (problems.length) {
        throw new BadRequestException({
          error: 'ConsentRequired',
          message: problems.map((p) => p.message).join(' '),
          problems,
        });
      }
    }
    const isActive = String(existing.status).toUpperCase() === 'ACTIVE';
    const goingActive = String((dto as any).status ?? '').toUpperCase() === 'ACTIVE';
    if (isActive || goingActive) {
      await this.assertRunnable(dto.definition ?? existing.definition, id);
    }

    // G3: the update and its version snapshot commit together.
    const updated = await this.prisma.$transaction(async (tx) => {
      const w = await tx.workflow.update({
        where: { id },
        data: {
          ...dto,
          version: dto.definition ? nextVersion : undefined,
        },
      });

      if (dto.definition) {
        await tx.workflowVersion.create({
          data: {
            workflowId: id,
            version: nextVersion,
            definition: dto.definition,
            createdBy: savedBy(),
          },
        });
      }

      return w;
    });

    // Scheduler sync is external I/O and deliberately stays OUTSIDE the
    // transaction: a slow or failing scheduler must not hold a DB transaction
    // open, nor roll back an edit that is already committed.

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workflow.delete({ where: { id } });
  }

  /**
   * H6 — the graph rules (graph-rules.ts) bite where a workflow would start running: saving as
   * ACTIVE, editing one that is ACTIVE, and activation. A DRAFT may be saved with problems, because
   * a designer saves work in progress; it just cannot go live until the problems are fixed.
   */
  private async assertRunnable(definition: unknown, workflowId?: string): Promise<void> {
    const names = (await this.listEntities()).map((e) => e.name);
    const registry = buildPulseRegistry().all();
    const problems = validateDefinition(definition as any, {
      pulses: registry,
      entities: names.length ? names : undefined,
    });
    // Clock-side rules (Wave C): cron syntax / time zone, and a webhook path no other ACTIVE
    // workflow already uses. Same refusal shape as the graph rules.
    problems.push(...(await this.clock.activationProblems(definition, workflowId)));
    // Recipient rules: a role that does not exist here, or that nobody holds, is refused now —
    // the task it would create sits in nobody's inbox (Loan-desk acceptance, 2026-09-23).
    const roles = await this.listRoleMembership();
    if (roles) problems.push(...assigneeProblems(definition as any, registry, roles));
    if (problems.length) {
      throw new BadRequestException({ error: 'InvalidDefinition', message: problems.join(' '), problems });
    }
  }

  // ─── Status ───────────────────────────────────────────

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    if (status === 'ACTIVE') {
      // Agents read, workflows act. A graph where a gateway branches on an agent's answer with no
      // person in between is refused HERE, at the moment it would start running, with the exact
      // steps named — a designer can draw it incomplete and come back, but it cannot go live.
      const current = await this.prisma.workflow.findUnique({ where: { id }, select: { definition: true } });
      const problems = lintConsent(current?.definition as any);
      if (problems.length) {
        throw new BadRequestException({
          error: 'ConsentRequired',
          message: problems.map((p) => p.message).join(' '),
          problems,
        });
      }
      await this.assertRunnable(current?.definition, id);
    }
    const workflow = await this.prisma.workflow.update({
      where: { id },
      data: { status },
    });

    return workflow;
  }

  // ─── Versioning ───────────────────────────────────────

  async getVersions(workflowId: string) {
    return this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  /** One version in full (its steps), for a read-only preview on the canvas. */
  async getVersion(workflowId: string, versionId: string) {
    const v: any = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId, workflowId },
    });
    if (!v) throw new NotFoundException('Version not found');
    return { ...v, definition: versionDefinition(v.definition) };
  }

  async rollback(workflowId: string, versionId: string) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.workflowId !== workflowId) {
      throw new NotFoundException('Version not found');
    }

    const definition = versionDefinition(version.definition);
    if (!definition) throw new BadRequestException('That version has no readable steps to restore.');
    // Restoring saves the old steps as a NEW version, so a restore can itself be undone.
    return this.update(workflowId, { definition });
  }

  // ─── Execution ────────────────────────────────────────

  async testRun(
    workflowId: string,
    triggerData?: any,
    runId?: string,
    taskAnswers?: Record<string, Record<string, unknown>>,
    background = false,
    /** The designer's canvas, saved or not — tested as it is (n8n's behaviour). Else the saved one. */
    draft?: any,
  ) {
    const workflow = await this.findOne(workflowId);
    const definition = draft && typeof draft === 'object' && Array.isArray(draft.nodes) ? draft : workflow.definition;
    return this.testDefinition(definition, workflow.entityName, triggerData, runId, taskAnswers, background, workflowId);
  }

  /**
   * Test a canvas that has never been saved: the designer runs steps while still designing, and
   * saves once the design is finished. Same engine, same rules as a saved workflow's test.
   */
  async testDraft(
    definition: any,
    entityName: string | undefined,
    triggerData?: any,
    runId?: string,
    taskAnswers?: Record<string, Record<string, unknown>>,
    background = false,
  ) {
    if (!definition || typeof definition !== 'object' || !Array.isArray(definition.nodes)) {
      throw new BadRequestException('Send the steps to test.');
    }
    return this.testDefinition(definition, entityName, triggerData, runId, taskAnswers, background);
  }

  // A test runs the SAME engine on the SAME definition as production, for real: what it writes is
  // kept and what it sends is delivered (as in n8n / Activepieces). So "what you test is what runs".
  // Only how it is driven differs: tasks use the typed answers, and a Wait really waits only when
  // the designer runs the test in the background (skippable there).
  private async testDefinition(
    definition: any,
    entityName: string | undefined,
    triggerData: any,
    runId: string | undefined,
    taskAnswers: Record<string, Record<string, unknown>> | undefined,
    background: boolean,
    /** A saved workflow keeps the result as its last test, shown again when it is reopened. */
    keepFor?: string,
  ) {
    const keep = keepFor === undefined ? undefined : (result: unknown) => void this.keepLastTest(keepFor, result);
    const opts = { taskAnswers, entityName, ...(keep ? { onDone: keep } : {}) };
    if (background) return this.pulseRunner.startTestFlow(definition, triggerData || {}, runId, opts);
    const result = await this.pulseRunner.runTestFlow(definition, triggerData || {}, runId, opts);
    if (keepFor !== undefined) await this.keepLastTest(keepFor, result);
    return result;
  }

  /**
   * Keep a test's step outputs on the workflow, so its Input and Output panes are not empty when it
   * is reopened. Each output is capped: a step that returned a huge list keeps a marker instead.
   * Best effort — a test never fails because its result could not be kept.
   */
  private async keepLastTest(workflowId: string, result: unknown): Promise<void> {
    try {
      const r = (result ?? {}) as { status?: string; input?: unknown; steps?: any[] };
      const MAX = 64 * 1024;
      const fit = (value: unknown) => {
        try {
          const size = JSON.stringify(value ?? null).length;
          return size > MAX ? { _truncated: true, size } : value ?? null;
        } catch {
          return null;
        }
      };
      const snapshot = {
        at: new Date().toISOString(),
        status: r.status ?? null,
        input: fit(r.input),
        steps: (Array.isArray(r.steps) ? r.steps : []).map((s) => ({
          nodeId: s?.nodeId,
          status: s?.status,
          output: fit(s?.output),
          error: s?.error ?? null,
        })),
      };
      await (this.prisma as any).workflow.update({ where: { id: workflowId }, data: { lastTest: snapshot } });
    } catch {
      /* the last test is a convenience for the designer */
    }
  }

  /** A background test's result (or still running) — only for the person who started it. */
  testRunResult(runId: string) {
    const r = this.pulseRunner.testFlowResult(runId);
    if (!r) throw new NotFoundException('Test run not found');
    return r;
  }

  /** Skip wait: the Wait a background test is on ends now. */
  skipTestWait(runId: string) {
    if (!this.pulseRunner.skipTestWait(runId)) throw new NotFoundException('Test run not found');
    return { skipped: true };
  }

  /** Stop a background test (the designer left, or pressed Stop). */
  cancelTestRun(runId: string) {
    if (!this.pulseRunner.cancelTestFlow(runId)) throw new NotFoundException('Test run not found');
    return { stopped: true };
  }

  async getRuns(
    workflowId: string,
    opts: { status?: string; limit?: number },
  ) {
    const where: any = { workflowId };
    if (opts.status) where.status = opts.status;

    // Clamped, not trusted (scalability-plan §1.3). `opts.limit || 20` covered a missing value
    // but passed `-1` straight to Prisma, where a negative `take` means "walk backwards" rather
    // than "invalid" — and passed `1000000` through as a request to materialise the entire run
    // history of a busy workflow.
    const requestedLimit = Math.trunc(Number(opts.limit));
    const take = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 20;

    return this.prisma.workflowRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take,
      select: {
        id: true,
        triggerEvent: true,
        status: true,
        startedAt: true,
        completedAt: true,
        error: true,
        _count: { select: { steps: true } },
      },
    });
  }

  async getRunDetail(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        steps: { orderBy: { executedAt: 'asc' } },
        workflow: { select: { name: true, entityName: true } },
      },
    });
    if (!run) throw new NotFoundException('Run not found');
    // The steps as they were for THIS run (the version it was pinned to), so each step reads by its
    // label ("Notify Org Admin"), not its id, even after the workflow has since been edited.
    const wf: any = await this.prisma.workflow.findUnique({
      where: { id: run.workflowId },
      select: { name: true, version: true, definition: true },
    });
    let definition = wf?.definition ?? null;
    if (run.definitionVersion != null && wf && run.definitionVersion !== wf.version) {
      const snap: any = await this.prisma.workflowVersion.findFirst({
        where: { workflowId: run.workflowId, version: run.definitionVersion },
        select: { definition: true },
      });
      definition = versionDefinition(snap?.definition) ?? definition;
    }
    return { ...run, workflowName: wf?.name ?? null, currentVersion: wf?.version ?? null, definition: versionDefinition(definition) };
  }


  // ─── Runs & Incidents (Wave D) ────────────────────────

  /** Every run the tenant can see, newest first, paged. The Prisma middleware scopes the tenant. */
  async listRuns(opts: { status?: string; workflowId?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.workflowId) where.workflowId = opts.workflowId;
    const requested = Math.trunc(Number(opts.pageSize));
    const take = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 200) : 25;
    const page = Number.isFinite(Number(opts.page)) && Number(opts.page) > 1 ? Math.trunc(Number(opts.page)) : 1;
    return this.pageRuns(where, take, (page - 1) * take);
  }

  /** Runs that need a person: FAILED, plus runs the engine had to abandon ("Interrupted: ..."). */
  async listIncidents() {
    return this.pageRuns({ OR: [{ status: 'FAILED' }, { error: { startsWith: 'Interrupted' } }] }, 200, 0);
  }

  private async pageRuns(where: any, take: number, skip: number) {
    const [rows, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          workflowId: true,
          status: true,
          error: true,
          triggerEvent: true,
          startedAt: true,
          completedAt: true,
          definitionVersion: true,
          // The parked node lives inside the context JSON (there is no pausedAtNodeId column);
          // the variables in it are dropped below, the list does not need them.
          context: true,
          workflow: { select: { name: true } },
        },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);
    const items = (rows as any[]).map(({ workflow, context, ...run }) => ({
      ...run,
      pausedAtNodeId: (context as any)?.pausedAtNodeId ?? null,
      workflowName: workflow?.name ?? null,
    }));
    return { items, total };
  }

  /**
   * Stop a live run. The runner's compare-and-set decides: an unknown run is 404, a run that
   * already finished is 409 — its message says which state it is in.
   */
  async cancelRun(runId: string) {
    try {
      const result = await this.pulseRunner.cancelRun(runId);
      return { id: result.runId, status: result.status };
    } catch (err: any) {
      const message = String(err?.message ?? err);
      if (/not found/.test(message)) throw new NotFoundException('Run not found');
      if (/is already/.test(message)) throw new ConflictException(message.replace(/^cancelRun: /, ''));
      throw err;
    }
  }

  /**
   * Run again from the same trigger data, as a FRESH run under the caller's tenant (the runner
   * reads the request context). Nothing is replayed in place: the failed run keeps its history
   * and the new one gets its own id. Only an ACTIVE workflow may be re-run.
   */
  async retryRun(runId: string) {
    const run: any = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: true },
    });
    if (!run) throw new NotFoundException('Run not found');
    const wf = run.workflow;
    if (String(wf?.status ?? '').toUpperCase() !== 'ACTIVE') {
      throw new BadRequestException('This workflow is not active, so its runs cannot be retried.');
    }
    const result = await this.pulseRunner.execute(wf, run.triggerEvent, run.triggerData ?? {});
    return { id: result.runId, status: result.status };
  }

  // ─── Catalog ──────────────────────────────────────────

  /**
   * The catalogue the designer and the AI both read.
   *
   * Served from the LIVE pulse registry and live schema introspection. It used to
   * be a literal list of legacy node types (onCreate, mutateData, sendEmail) that
   * the pulse interpreter has no pulse for, so the designer offered components the
   * engine could not execute — and the entity list was frozen into the frontend
   * bundle at build time (G19).
   */
  async getCatalog() {
    const pulses = buildPulseRegistry().all().map((p: any) => ({
      type: p.meta.type,
      category: p.meta.category,
      label: p.meta.label,
      description: p.meta.description,
      icon: p.meta.icon,
      // Every pulse that computes its branches from its cases is a condition to the designer —
      // the engine itself routes on type, never on kind.
      kind:
        p.meta.category === 'trigger'
          ? 'trigger'
          : p.meta.dynamicBranches === 'cases'
            ? 'condition'
            : 'action',
      config: p.config ?? [],
      io: p.io ?? { inputs: [], outputs: [] },
      // The branch contract (core/branches.ts): one designer handle per label, one edge per
      // label at save. optionalBranches are fixed labels that fire only for a config value.
      branches: p.meta.branches ?? [],
      optionalBranches: p.meta.optionalBranches ?? {},
      dynamicBranches: p.meta.dynamicBranches ?? null,
      loop: !!p.meta.loop,
      errorEdge: acceptsErrorEdge(p.meta),
      // Triggers: what a run starts with and where that comes from (pulses/core/trigger-input).
      triggerInput: p.meta.triggerInput ?? null,
    }));

    return {
      pulses,
      entities: await this.listEntities(),
      // PG-06 — the designer's recipient picker offers THESE roles, so it can
      // never suggest a role this deployment does not have.
      roles: await this.listRoles(),
      conditionOperators: [...SUPPORTED_RULE_OPERATORS],
      conditionOperatorLabels: RULE_OPERATOR_LABELS,
    };
  }

  /**
   * PG-05 — who else already fires on this entity and event.
   *
   * The trigger model allows unbounded fan-out: any number of workflows can be
   * registered on the same entity event, and they all run. That is the intended
   * design, but it was invisible — an author adding a sixth workflow to an
   * entity's update event had no way to know the other five existed, or in what
   * order they run.
   */
  async getFanOut(entityName: string, excludeId?: string, triggerType?: string) {
    if (!entityName) return { count: 0, workflows: [], order: 'oldest first' };
    // Only record triggers share an event. A workflow on "created" never runs alongside one on
    // "updated", so counting every active workflow on the table warned about runs that never meet.
    const RECORD_TRIGGERS = ['trigger.recordCreated', 'trigger.recordUpdated', 'trigger.recordDeleted'];
    if (triggerType && !RECORD_TRIGGERS.includes(triggerType)) return { count: 0, workflows: [], order: 'oldest first' };
    const rows = await this.prisma.workflow.findMany({
      where: { entityName, status: 'ACTIVE', ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, createdAt: true, definition: true },
    });
    const triggerOf = (def: any) =>
      ((def?.nodes ?? []) as any[]).find((n) => typeof n?.type === 'string' && n.type.startsWith('trigger.'))?.type;
    const workflows = rows
      .filter((w: any) => !triggerType || triggerOf(w.definition) === triggerType)
      .map(({ definition: _d, ...w }: any) => w);
    // Order is stated explicitly so the author does not have to infer it.
    return { count: workflows.length, workflows, order: 'oldest first' };
  }

  /** The app's own roles, for the recipient picker. */
  private async listRoles(): Promise<string[]> {
    try {
      const rows = await (this.prisma as any).rolesAndPermissions.findMany({ select: { role: true } });
      return (rows ?? []).map((r: any) => String(r.role ?? '').trim()).filter(Boolean);
    } catch {
      return [];
    }
  }


  /**
   * Every role in the caller's organisation with how many users hold it. Reads go through the
   * tenant-scoped Prisma client, so a tenant sees only its own roles and users. Returns null when
   * the tables cannot be read — the recipient check is then skipped rather than refusing every role.
   */
  private async listRoleMembership(): Promise<Array<{ name: string; members: number }> | null> {
    try {
      const roles: any[] = await (this.prisma as any).rolesAndPermissions.findMany({ select: { id: true, role: true } });
      const counts: any[] = await (this.prisma as any).user.groupBy({ by: ['roleId'], _count: { _all: true } });
      const byRole = new Map<unknown, number>(counts.map((c) => [c.roleId, Number(c._count?._all ?? 0)]));
      return roles
        .map((r) => ({ name: String(r.role ?? '').trim(), members: byRole.get(r.id) ?? 0 }))
        .filter((r) => r.name);
    } catch {
      return null;
    }
  }

  /**
   * Entity names + fields, read from the running Prisma client rather than baked
   * into the frontend. Adding a model must not require a frontend rebuild.
   */
  private async listEntities(): Promise<Array<{ name: string; fields: string[] }>> {
    try {
      const dmmf: any = (this.prisma as any)._runtimeDataModel?.models ?? {};
      const internal = new Set([
        'Workflow', 'WorkflowVersion', 'WorkflowRun', 'WorkflowRunStep',
        'Notification', 'NotificationDelivery', 'Organization', 'BusinessUnit',
      ]);
      return Object.keys(dmmf)
        .filter((name) => !internal.has(name))
        .map((name) => ({
          name,
          fields: (dmmf[name].fields ?? [])
            .filter((f: any) => f.kind === 'scalar' || f.kind === 'enum')
            .map((f: any) => f.name),
        }));
    } catch {
      return [];
    }
  }
}
