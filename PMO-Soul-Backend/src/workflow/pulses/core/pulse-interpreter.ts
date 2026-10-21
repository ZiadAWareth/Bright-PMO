import type { PulseWorkflowDefinition, PulseNode, PulseEdge } from './graph';
import { PulseRegistry } from './pulse-registry';
import type { PulseRunStore, PulseRunRecord, PulseStepRecord } from './run-store';
import type { PulseServices, PulseContext, Pulse } from './pulse.contract';
import { type NodeRuntimeConfig, type RunPulseHooks, type RunPulseNode, runPulse, applyOutputMapping } from './run-pulse';
import { ROOT_SCOPE_ID, type LoopFrame, enterLoopScope, exitLoopScope } from './scope';
import { evaluate, resolveTemplate } from './expression';
import { retiredPassThrough } from './retired';

/** Hard cap on node executions per run — a backstop against a runaway loop even
 *  when a loop's own guard is misconfigured. */
const STEP_CAP = 10_000;

/**
 * Transitional alias: the clock service used to resume an elapsed timer with this label, relying
 * on no edge carrying it so the interpreter fell through to the unlabelled edges. `resume()` now
 * maps it to an explicit continuation (`branch: null`); remove once nothing sends it.
 */
export const WAIT_ELAPSED_ALIAS = 'elapsed';

/**
 * G9 — isolating copy for data entering a run (standing rule 7).
 *
 * Several workflows can be registered on the same entity event, and they were all
 * handed the SAME trigger-data object (a shallow spread shares every nested
 * value). A setVariable in one run then mutated the input of the others.
 *
 * structuredClone preserves Date/Map/Set but throws on class instances such as a
 * Prisma Decimal; the JSON fallback is lossy on those but still breaks the shared
 * reference, which is the property that matters.
 */
function deepCopy<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return (Array.isArray(value) ? [...value] : { ...(value as object) }) as T;
    }
  }
}

/**
 * PulseInterpreter — the PARALLEL engine.
 *
 * Mirrors the legacy interpreter's technique (trigger → token walk → per-node
 * execute → follow outgoing edges → durable pause/resume) but every node is a
 * Pulse resolved via the registry and run through the shared wrapper. Beyond the
 * linear/branch/wait model it adds, at the interpreter (token) level:
 *   - fork/join   — a pulse with meta.join='and' waits for a token on every
 *                   incoming edge before firing (parallel join);
 *   - multi-route — a pulse may emit `branches: []` to follow several edges (OR);
 *   - loops       — a pulse with meta.loop drives iteration, routing tokens onto
 *                   the `body` edge each pass and `done` when finished.
 * Join/loop state lives in reserved `$arrivals` / `$loops` variables so it
 * survives a pause/resume. It talks to no Prisma directly — persistence via the
 * PulseRunStore port, side effects via PulseServices.
 */
/** Steps that pause a run until something outside it happens (time passing, a person answering). */
const PAUSING_TYPES = new Set(['time.wait', 'human.userTask']);

export class PulseInterpreter {
  constructor(
    private readonly registry: PulseRegistry,
    private readonly store: PulseRunStore,
    private readonly services: PulseServices,
    private readonly hooks: RunPulseHooks = {},
  ) {}

  async execute(opts: {
    runId: string;
    workflowId: string;
    organizationId?: number;
    definition: PulseWorkflowDefinition;
    variables?: Record<string, unknown>;
    isTest?: boolean;
    /** The workflow's `version` at start — pinned on the run so a later resume replays the
     *  SAME definition (see PulseRunRecord.definitionVersion). */
    definitionVersion?: number;
  }): Promise<PulseRunRecord> {
    const run: PulseRunRecord = {
      id: opts.runId,
      workflowId: opts.workflowId,
      organizationId: opts.organizationId,
      status: 'RUNNING',
      variables: deepCopy(opts.variables ?? {}),
      definitionVersion: opts.definitionVersion,
    };
    await this.store.createRun(run);

    const trigger = opts.definition.nodes.find((n) => n.kind === 'trigger');
    const startIds = trigger
      ? this.outgoing(opts.definition, trigger.id).map((e) => e.to)
      : opts.definition.nodes.filter((n) => n.kind !== 'trigger').slice(0, 1).map((n) => n.id);

    return this.walk(opts.definition, run, startIds, !!opts.isTest);
  }

  /**
   * Continue a run that was parked at a durable pause.
   *
   * `outputs` is what the waiting node produced once the world caught up — for a User Task, who
   * completed it and what they submitted. It is applied through the SAME mapping normal execution
   * uses, so a node's `outputMap` behaves identically whether it ran straight through or waited
   * a week for a person.
   *
   * `branch` is the label to leave on: 'completed' / 'overdue' for a task, 'timeout' for a wait
   * whose deadline passed. `null` (or omitted) is a PLAIN CONTINUATION — a timer that elapsed, a
   * condition that came true — and follows the node's unlabelled edges only, never a labelled one
   * (timeout / overdue / error). The label 'elapsed' is accepted as an alias for `null` while the
   * clock service moves over; nothing routes on it.
   *
   * Refuses, legibly, when the run is not parked at `waitNodeId`: a second submit of the same
   * task, a stale task whose run has moved on, or a run that already finished or was cancelled
   * must not re-run the continuation (it can send an email or charge a card).
   */
  async resume(
    definition: PulseWorkflowDefinition,
    runId: string,
    waitNodeId: string,
    signal: {
      branch?: string | null;
      variables?: Record<string, unknown>;
      outputs?: Record<string, unknown>;
    } = {},
  ): Promise<PulseRunRecord> {
    const run = await this.store.getRun(runId);
    if (!run) throw new Error(`PulseInterpreter.resume: run ${runId} not found`);
    if (run.status !== 'WAITING') {
      throw new Error(
        `PulseInterpreter.resume: run ${runId} is ${run.status}, not waiting — nothing to resume` +
          ` (already resumed, finished or cancelled)`,
      );
    }
    if (run.pausedAtNodeId !== waitNodeId) {
      throw new Error(
        `PulseInterpreter.resume: run ${runId} is parked at node ${String(run.pausedAtNodeId)}, not ${waitNodeId}` +
          ` — stale signal for a step the run has already left`,
      );
    }
    if (signal.variables) Object.assign(run.variables, signal.variables);
    if (signal.outputs) {
      const waitNode = definition.nodes.find((n) => n.id === waitNodeId);
      // A resume naming a node the definition no longer has is a real case: the workflow can be
      // edited while a task sits open. Dropping the outputs silently would continue the run with
      // the person's answer missing, so refuse instead.
      if (!waitNode) {
        const message = `PulseInterpreter.resume: node ${waitNodeId} is no longer in workflow ${run.workflowId}`;
        await this.store.updateStep(runId, waitNodeId, { status: 'FAILED', error: message });
        throw new Error(message);
      }
      applyOutputMapping(this.splitNode(waitNode), signal.outputs, run.variables);
    }
    // The parked step was recorded WAITING; what came back (the person's answer, or nothing for
    // a timer) is its output, and it is finished now.
    await this.store.updateStep(runId, waitNodeId, {
      status: 'COMPLETED',
      ...(signal.outputs ? { output: signal.outputs } : {}),
    });
    run.status = 'RUNNING';
    run.pausedAtNodeId = undefined;
    // H4 — tokens that were still queued when the run parked (the other branches of a parallel
    // split). They ride along behind the wait node's own continuation so a join can still fire.
    const pending = Array.isArray(run.variables.$queue) ? (run.variables.$queue as unknown[]).map(String) : [];
    delete run.variables.$queue;
    await this.store.saveRun(run);

    const branch = signal.branch === WAIT_ELAPSED_ALIAS ? null : signal.branch ?? null;
    const nextIds = this.outgoing(definition, waitNodeId, branch).map((e) => e.to);
    return this.walk(definition, run, [...nextIds, ...pending], false);
  }

  // ── internals ────────────────────────────────────────────────────────────

  /**
   * The token walk, with one guarantee around it: whatever throws OUTSIDE runPulse (the store,
   * a hook, an interpreter bug) still lands the run in FAILED with the message. It used to
   * propagate and leave the row RUNNING forever, which nothing could tell from a run that was
   * genuinely still busy.
   */
  private async walk(
    def: PulseWorkflowDefinition,
    run: PulseRunRecord,
    startIds: string[],
    isTest: boolean,
  ): Promise<PulseRunRecord> {
    try {
      return await this.walkTokens(def, run, startIds, isTest);
    } catch (err) {
      run.status = 'FAILED';
      run.error = `Interrupted: ${err instanceof Error ? err.message : String(err)}`;
      await this.store.saveRun(run);
      return run;
    }
  }

  private async walkTokens(
    def: PulseWorkflowDefinition,
    run: PulseRunRecord,
    startIds: string[],
    isTest: boolean,
  ): Promise<PulseRunRecord> {
    const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));
    const incoming = incomingCounts(def);
    // Join/loop state survives pause/resume via reserved variables.
    const arrivals: Record<string, number> = { ...((run.variables.$arrivals as Record<string, number>) ?? {}) };
    const loops: Record<string, LoopFrame> = { ...((run.variables.$loops as Record<string, LoopFrame>) ?? {}) };
    // Output of the most recent completed step — what a loop aggregates per iteration.
    let lastOutput: unknown;

    const queue = [...startIds];
    let steps = 0;

    // H4 — the pending queue is persisted too: a wait on one parallel branch used to drop every
    // token still queued for the others, so the join never fired after the resume.
    const pauseState = () => {
      run.variables.$arrivals = arrivals;
      run.variables.$loops = loops;
      run.variables.$queue = [...queue];
    };
    const clearState = () => {
      delete run.variables.$arrivals;
      delete run.variables.$loops;
      delete run.variables.$queue;
    };

    while (queue.length) {
      if (++steps > STEP_CAP) {
        run.status = 'FAILED';
        run.error = `Step cap (${STEP_CAP}) exceeded — possible unbounded loop.`;
        await this.store.saveRun(run);
        return run;
      }

      const id = queue.shift() as string;
      const node = nodeMap.get(id);
      if (!node) continue;

      // A step that PAUSES the run (a Wait, a User Task) goes last: every other parallel branch
      // runs as far as it can first. Parking first held those branches behind the pause — a
      // Terminate All on another branch could not stop a Wait, it ran only after it. Once only
      // pausing steps are left, they run in order.
      if (PAUSING_TYPES.has(node.type) && queue.some((other) => !PAUSING_TYPES.has(nodeMap.get(other)?.type ?? ''))) {
        queue.push(id);
        steps--; // a reorder, not a step
        continue;
      }

      // Trigger nodes are pass-through start markers.
      if (node.kind === 'trigger') {
        queue.push(...this.outgoing(def, node.id).map((e) => e.to));
        continue;
      }

      // A step removed from the catalogue (core/retired.ts) is skipped, not failed: the workflow was
      // saved before the removal, and the removed step never did anything later steps rely on.
      const pulse = this.registry.get(node.type) ?? retiredPassThrough(node.type);
      if (!pulse) {
        run.status = 'FAILED';
        run.error = `No pulse registered for type "${node.type}"`;
        await this.store.saveRun(run);
        return run;
      }

      // ── JOIN: accumulate arrivals; fire once when all incoming have arrived ──
      if (pulse.meta.join === 'and') {
        const got = (arrivals[id] ?? 0) + 1;
        const need = incoming[id] ?? 1;
        if (got < need) {
          arrivals[id] = got;
          // Said live, so the branch that arrived shows as done and the join as waiting.
          this.hooks.onArrive?.(id, got, need);
          continue; // wait for the remaining branches
        }
        arrivals[id] = 0; // fire; reset so the join can be reused (loops)
        this.hooks.onStart?.(id, {});
        await this.recordStep(run, node, 'COMPLETED', 0);
        this.hooks.onEnd?.(id, {});
        queue.push(...this.outgoing(def, node.id).map((e) => e.to));
        continue;
      }

      // ── LOOP: interpreter drives iteration; routes to `body` or `done` ──
      if (pulse.meta.loop) {
        // Each visit records what it did — the pass it starts, or the results once done — so the
        // loop's Output pane shows data like any step (n8n's loop/done outputs), not an empty {}.
        const inputSnapshot = { ...run.variables };
        this.hooks.onStart?.(node.id, {});
        const { decision, output } = this.stepLoop(node, pulse, run, loops, lastOutput);
        lastOutput = undefined;
        await this.recordStep(run, node, 'COMPLETED', 0, { output, input: inputSnapshot });
        this.hooks.onEnd?.(node.id, { outputs: output });
        queue.push(...this.outgoing(def, node.id, decision).map((e) => e.to));
        continue;
      }

      // ── NORMAL pulse via the wrapper ──
      const ctx: PulseContext = {
        variables: run.variables,
        scopeId: ROOT_SCOPE_ID,
        services: this.services,
        run: { id: run.id, workflowId: run.workflowId, organizationId: run.organizationId },
        isTest,
        nodeId: node.id,
      };
      const inputSnapshot = { ...run.variables };
      const start = Date.now();
      const outcome = await runPulse(pulse, this.splitNode(node), ctx, this.hooks);
      run.variables = outcome.variables;
      const durationMs = Date.now() - start;

      if (outcome.status === 'skipped') {
        await this.recordStep(run, node, 'SKIPPED', durationMs, { input: inputSnapshot });
        queue.push(...this.outgoing(def, node.id).map((e) => e.to));
        continue;
      }

      if (outcome.status === 'failed') {
        await this.recordStep(run, node, 'FAILED', durationMs, { error: outcome.error?.message, input: inputSnapshot });
        const errEdges = this.errorEdges(def, node.id);
        // H2 — an error edge drawn on the node IS the designer's error policy. Routing used to
        // need `_runtime.onError === 'route'` as well, which nothing in the designer ever set, so
        // every technical failure (HTTP 500, DB fault, SMTP) failed the run past a handler that was
        // drawn for exactly that. An explicit onError still wins, so 'fail' can force a stop.
        const onError = this.splitNode(node).runtime.onError ?? (errEdges.length ? 'route' : 'fail');
        const err = outcome.error as (Error & { code?: string }) | undefined;
        if (onError === 'route' && errEdges.length) {
          this.setErrorVariable(run, node, err?.code ?? err?.name ?? 'Error', err?.message ?? '');
          queue.push(...errEdges.map((e) => e.to));
          continue;
        }
        const loopId = this.loopItemError(def, node, loops, err?.code ?? err?.name ?? 'Error', err?.message ?? '');
        if (loopId) {
          this.setErrorVariable(run, node, err?.code ?? err?.name ?? 'Error', err?.message ?? '');
          queue.push(loopId);
          continue;
        }
        run.status = 'FAILED';
        run.error = outcome.error?.message;
        await this.store.saveRun(run);
        return run;
      }

      const result = outcome.result ?? {};
      // A node that parks the run is WAITING, not COMPLETED: the run shows as waiting and so must
      // its step, until resume() settles it.
      await this.recordStep(run, node, result.wait ? 'WAITING' : 'COMPLETED', durationMs, { output: result.outputs, input: inputSnapshot });
      lastOutput = result.outputs;

      if (result.end) {
        run.status = result.end.status === 'error' ? 'FAILED' : 'COMPLETED';
        if (result.end.errorName) run.error = result.end.errorName;
        clearState();
        await this.store.saveRun(run);
        return run;
      }

      if (result.wait) {
        // Record the wait BEFORE parking the run. Its config — assignee, form, due date — used to
        // be dropped here, leaving `pausedAtNodeId` as the only trace, so nothing could list the
        // task and nothing ever called resume(). Recording first is deliberate: if the store
        // cannot persist the wait, the error surfaces instead of the run parking invisibly with
        // no task behind it.
        await this.store.recordWait({
          runId: run.id,
          workflowId: run.workflowId,
          organizationId: run.organizationId,
          nodeId: node.id,
          kind: result.wait.kind,
          config: result.wait.config ?? {},
        });
        run.status = 'WAITING';
        run.pausedAtNodeId = node.id;
        pauseState();
        await this.store.saveRun(run);
        return run;
      }

      if (result.error) {
        const errEdges = this.errorEdges(def, node.id);
        if (errEdges.length) {
          this.setErrorVariable(run, node, result.error.name, result.error.message);
          queue.push(...errEdges.map((e) => e.to));
          continue;
        }
        const loopId = this.loopItemError(def, node, loops, result.error.name, result.error.message);
        if (loopId) {
          this.setErrorVariable(run, node, result.error.name, result.error.message);
          queue.push(loopId);
          continue;
        }
        run.status = 'FAILED';
        run.error = `${result.error.name}: ${result.error.message}`;
        await this.store.saveRun(run);
        return run;
      }

      // Routing: multi-branch (OR) → single branch (XOR) → all outgoing (default/fork).
      if (result.branches && result.branches.length) {
        for (const label of result.branches) {
          queue.push(...this.outgoing(def, node.id, label).map((e) => e.to));
        }
      } else if (result.branch !== undefined) {
        queue.push(...this.outgoing(def, node.id, result.branch).map((e) => e.to));
      } else {
        queue.push(...this.outgoing(def, node.id).map((e) => e.to));
      }
    }

    if (run.status === 'RUNNING') {
      run.status = 'COMPLETED';
      clearState();
      await this.store.saveRun(run);
    }
    return run;
  }

  /**
   * Advance an interpreter-driven loop; returns the branch label to route to.
   *
   * Loop state is a `LoopFrame` in `$loops`, keyed by node id:
   *   - entering (i === 0) snapshots the scoped names (`item`/`index`) so `done`
   *     can restore them — nested loops on the default names no longer clobber
   *     each other, and nothing leaks past the loop;
   *   - re-entering after a body pass records that pass into `results` — the last
   *     completed step's outputs, or the error a `skip`/`stop` policy caught;
   *   - `done` publishes `results` under `<as>` (default `results`) and restores scope.
   */
  private stepLoop(
    node: PulseNode,
    pulse: Pulse,
    run: PulseRunRecord,
    loops: Record<string, LoopFrame>,
    lastOutput: unknown,
  ): { decision: 'body' | 'done'; output: Record<string, unknown> } {
    // Use RAW config here (no deep-resolve): forEach resolves its collection to a
    // real array via resolveTemplate once on entry, and while passes its condition
    // raw to evaluate(), which resolves {{vars}} against the CURRENT variables itself.
    const cfg = this.splitNode(node).config;
    const key = node.id;
    const isForEach = pulse.meta.loop === 'forEach';
    const itemVar = String(cfg.item ?? 'item');
    const indexVar = String(cfg.index ?? 'index');
    const asVar = String(cfg.as ?? 'results').trim() || 'results';
    const scoped = isForEach ? [itemVar, indexVar] : [indexVar];

    const frame: LoopFrame = loops[key] ?? { i: 0 };
    if (frame.i === 0 && !frame.saved) {
      frame.saved = enterLoopScope(run.variables, scoped);
      frame.results = [];
      if (isForEach) {
        const raw = cfg.collection;
        const resolved = Array.isArray(raw) ? raw : typeof raw === 'string' ? resolveTemplate(raw, run.variables) : undefined;
        frame.collection = Array.isArray(resolved) ? resolved : [];
      }
    }
    const i = frame.i;
    const collection: unknown[] = frame.collection ?? [];

    // A body pass just finished (we are re-entered with i > 0): record it.
    let stop = false;
    if (i > 0) {
      const done = i - 1;
      const item = isForEach ? collection[done] : undefined;
      const results = (frame.results ??= []);
      if (frame.failed) {
        results.push({ index: done, item, error: { name: frame.failed.name, message: frame.failed.message } });
        stop = frame.failed.stop;
        delete frame.failed;
      } else {
        results.push({ index: done, item, output: lastOutput });
      }
    }

    const finish = () => {
      delete loops[key];
      exitLoopScope(run.variables, frame.saved);
      const results = frame.results ?? [];
      run.variables[asVar] = results;
      return { decision: 'done' as const, output: { passes: results.length, [asVar]: results } };
    };
    if (stop) return finish();

    if (isForEach) {
      if (i < collection.length) {
        run.variables[itemVar] = collection[i];
        run.variables[indexVar] = i;
        loops[key] = { ...frame, i: i + 1 };
        return { decision: 'body', output: { pass: i + 1, of: collection.length, [itemVar]: collection[i], [indexVar]: i } };
      }
      return finish();
    }

    // while / until
    const max = Number(cfg.maxIterations ?? 1000);
    run.variables[indexVar] = i; // expose the current iteration BEFORE evaluating
    if (i < max && evaluate(String(cfg.condition ?? ''), run.variables)) {
      loops[key] = { ...frame, i: i + 1 };
      return { decision: 'body', output: { pass: i + 1, [indexVar]: i } };
    }
    return finish();
  }

  /**
   * Per-item error policy. When a step inside a loop body fails and the innermost
   * ACTIVE loop enclosing it is configured `onItemError: 'skip' | 'stop'`, the
   * failure is handed to that loop (recorded on its frame) and the token goes back
   * to the loop node, which records the error in `<as>` and either continues with
   * the next item or ends via `done`. Returns the loop node id to route to, or
   * undefined when no loop claims the failure ('fail', the default, keeps today's
   * behaviour: the run fails).
   */
  private loopItemError(
    def: PulseWorkflowDefinition,
    node: PulseNode,
    loops: Record<string, LoopFrame>,
    name: string,
    message: string,
  ): string | undefined {
    let best: { id: string; size: number; policy: string } | undefined;
    for (const loopId of Object.keys(loops)) {
      const loopNode = def.nodes.find((n) => n.id === loopId);
      if (!loopNode || (loops[loopId]?.i ?? 0) === 0) continue;
      const body = this.loopBody(def, loopId);
      if (!body.has(node.id)) continue;
      // Innermost = the smallest body containing the failed node.
      if (!best || body.size < best.size) {
        const policy = String(this.splitNode(loopNode).config.onItemError ?? 'fail');
        best = { id: loopId, size: body.size, policy };
      }
    }
    if (!best || (best.policy !== 'skip' && best.policy !== 'stop')) return undefined;
    loops[best.id].failed = { name, message, stop: best.policy === 'stop' };
    return best.id;
  }

  /** Node ids reachable from a loop's `body` edge before coming back to the loop node. */
  private loopBody(def: PulseWorkflowDefinition, loopId: string): Set<string> {
    const body = new Set<string>();
    const stack = this.outgoing(def, loopId, 'body').filter((e) => e.condition === 'body').map((e) => e.to);
    while (stack.length) {
      const id = stack.pop() as string;
      if (id === loopId || body.has(id)) continue;
      body.add(id);
      stack.push(...def.edges.filter((e) => e.from === id).map((e) => e.to));
    }
    return body;
  }

  private async recordStep(
    run: PulseRunRecord,
    node: PulseNode,
    status: PulseStepRecord['status'],
    durationMs: number,
    extra: { error?: string; output?: unknown; input?: unknown } = {},
  ) {
    await this.store.recordStep({ runId: run.id, nodeId: node.id, pulseType: node.type, status, durationMs, ...extra });
  }

  /**
   * H3 — what the error branch can read. `{{error.name}}` is how a designer tells
   * AgentBudgetExhausted from NotFound on the same edge; before this nothing was set, so the
   * docs promised a variable the run never had.
   */
  private setErrorVariable(run: PulseRunRecord, node: PulseNode, name: string, message: string): void {
    run.variables.error = { name, message, nodeId: node.id };
  }

  private splitNode(node: PulseNode): RunPulseNode {
    const config: Record<string, unknown> = { ...(node.config ?? {}) };
    const runtime = (config._runtime as NodeRuntimeConfig | undefined) ?? {};
    delete config._runtime;
    // A trigger's typed test sample (core/trigger-input) is designer data, never a setting.
    delete config._sample;
    return { id: node.id, config, runtime };
  }

  /**
   * The edges a token leaves on.
   *
   * No branch (`undefined` / `null`) is the plain continuation: the UNLABELLED edges only. A
   * labelled edge — timeout, overdue, error, a gateway case — is taken only when a pulse (or a
   * resume signal) names it; it used to ride along with every default routing, so a wait passing
   * straight through in a test also ran its timeout path, and a node with an error handle drawn
   * ran the handler on success. A named branch no edge carries falls back to the continuation.
   */
  private outgoing(def: PulseWorkflowDefinition, from: string, branch?: string | null): PulseEdge[] {
    const edges = def.edges.filter((e) => e.from === from);
    const plain = edges.filter((e) => !e.condition);
    if (branch === undefined || branch === null) return plain;
    const matched = edges.filter((e) => e.condition === branch);
    return matched.length ? matched : plain;
  }

  /** Edges explicitly labelled `error` — STRICT (no fallback to default edges), so
   *  an unhandled business error fails the run instead of leaking to the happy path. */
  private errorEdges(def: PulseWorkflowDefinition, from: string): PulseEdge[] {
    return def.edges.filter((e) => e.from === from && e.condition === 'error');
  }
}

function incomingCounts(def: PulseWorkflowDefinition): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of def.edges) counts[e.to] = (counts[e.to] ?? 0) + 1;
  return counts;
}
