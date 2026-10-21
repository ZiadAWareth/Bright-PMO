/**
 * Persistence port for pulse instance state.
 *
 * The parallel interpreter mirrors the legacy engine's durable-pause technique
 * (persist on wait, resume on signal) but through this PORT — so the foundation
 * runs DB-free in tests, and at migration a Prisma-backed store simply reuses the
 * existing WorkflowRun / step tables. The engine never talks to Prisma directly.
 */
/** CANCELLED is set from outside the walk (PulseWorkflowRunner.cancelRun); the interpreter
 *  never writes it, and `resume()` refuses a run in that state. */
export type PulseRunStatus = 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PulseRunRecord {
  id: string;
  workflowId: string;
  organizationId?: number;
  status: PulseRunStatus;
  variables: Record<string, unknown>;
  pausedAtNodeId?: string;
  error?: string;
  /**
   * The workflow's `version` when the run started. A resume days later loads THAT snapshot
   * (WorkflowVersion) rather than whatever the definition has become, so a node renamed or an
   * edge moved while a task sat open cannot send the run somewhere its author never drew.
   */
  definitionVersion?: number;
}

/** WAITING is a step that parked the run (human task, timer); resume() settles it. */
export type PulseStepStatus = 'WAITING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

/** What resume() may change on the parked step: its outcome, what came back, or why it failed. */
export type PulseStepPatch = Partial<Pick<PulseStepRecord, 'status' | 'output' | 'error'>>;

export interface PulseStepRecord {
  runId: string;
  nodeId: string;
  pulseType: string;
  status: PulseStepStatus;
  durationMs: number;
  /** Snapshot of the variables the node received (its input) — powers the
   *  designer's "input = previous node's output" data view. */
  input?: unknown;
  output?: unknown;
  error?: string;
}

/**
 * A durable pause, as it is handed to the store.
 *
 * The interpreter used to keep only `pausedAtNodeId` when a node returned `wait`, so the wait's
 * own config — who the task is for, what it asks, when it is due — was computed and then thrown
 * away. Nothing could list "my tasks", and `resume()` had no caller, which is why a non-test run
 * containing a User Task paused forever.
 *
 * It stays a PORT call, not a Prisma write, for the same reason the rest of the engine does: the
 * interpreter has to run DB-free in tests.
 */
export interface PulseWaitRecord {
  runId: string;
  workflowId: string;
  organizationId?: number;
  nodeId: string;
  kind: 'approval' | 'task' | 'condition' | 'timer';
  /** The executor's wait config, verbatim. Shape depends on `kind`. */
  config: Record<string, unknown>;
}

export interface PulseRunStore {
  createRun(rec: PulseRunRecord): Promise<void>;
  getRun(id: string): Promise<PulseRunRecord | null>;
  saveRun(rec: PulseRunRecord): Promise<void>;
  recordStep(step: PulseStepRecord): Promise<void>;
  /** Settle the WAITING step of (runId, nodeId) — the one that parked the run — on resume. */
  updateStep(runId: string, nodeId: string, patch: PulseStepPatch): Promise<void>;
  /** Persist a durable pause so it can be found and resumed. Required: a store that cannot
   *  record a wait produces runs nobody can unpark. */
  recordWait(wait: PulseWaitRecord): Promise<void>;
}

/** In-memory store for tests and for the sideways foundation (until a Prisma-backed
 *  store is wired at migration time). */
export class InMemoryPulseRunStore implements PulseRunStore {
  readonly runs = new Map<string, PulseRunRecord>();
  readonly steps: PulseStepRecord[] = [];
  readonly waits: PulseWaitRecord[] = [];

  async createRun(rec: PulseRunRecord): Promise<void> {
    this.runs.set(rec.id, { ...rec });
  }

  async getRun(id: string): Promise<PulseRunRecord | null> {
    const r = this.runs.get(id);
    return r ? { ...r } : null;
  }

  async saveRun(rec: PulseRunRecord): Promise<void> {
    this.runs.set(rec.id, { ...rec });
  }

  async recordStep(step: PulseStepRecord): Promise<void> {
    this.steps.push(step);
  }

  async updateStep(runId: string, nodeId: string, patch: PulseStepPatch): Promise<void> {
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const s = this.steps[i];
      if (s.runId === runId && s.nodeId === nodeId && s.status === 'WAITING') {
        this.steps[i] = { ...s, ...patch };
        return;
      }
    }
  }

  async recordWait(wait: PulseWaitRecord): Promise<void> {
    this.waits.push(wait);
  }
}
