import { api } from '@/lib/api';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

/**
 * The shape the pulse configuration modal expects for a pulse.
 *
 * The catalogue endpoint returns a flatter CatalogPulse; useWorkflowCatalog's
 * toManifestEntry() adapts one to the other. Declared here because the modal and
 * its field editors import these types from './workflowService'.
 */
export interface PulseFieldDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'expression' | 'entity' | 'recipient' | 'json' | 'code';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  widget?: string;
  default?: unknown;
  help?: string;
  /** Shown only while another setting has one of these values (its default counts when unset). */
  showWhen?: { key: string; is: string[] };
}

/** Where a trigger's run input comes from: a table row, an HTTP call, a clock tick or a form. */
export type TriggerInputSource = 'record' | 'call' | 'clock' | 'form' | 'workflow';

export interface TriggerInputSpec {
  source: TriggerInputSource;
  event: string;
  form?: {
    key: string;
    fields: Array<{ key: string; label: string; type?: 'string' | 'email'; required?: boolean; example: string }>;
    stampedAt?: string;
  };
  secret?: string[];
}

/** What the server says a run of this trigger would start with (POST /pulses/trigger-input). */
export interface TriggerInputResult {
  /** lastRun = this workflow's last real run; sample = what the designer typed or picked;
   *  record = the table's newest row; null = nothing to start with yet. */
  from: 'lastRun' | 'sample' | 'record' | null;
  source: TriggerInputSource;
  data: Record<string, unknown> | null;
  variables: Record<string, unknown> | null;
  lastRun: { id: string; at: string } | null;
}

export interface PulseManifestEntry {
  meta: {
    type: string;
    category: string;
    label: string;
    description: string;
    icon?: string;
    async: 'never' | 'always' | 'auto';
    hasSideEffects: boolean;
    /** Triggers: what a run starts with (pulses/core/trigger-input on the server). */
    triggerInput?: TriggerInputSpec;
  };
  config: PulseFieldDescriptor[];
  io: {
    inputs: Array<{ key: string; label: string; description?: string }>;
    outputs: Array<{ key: string; label: string; description?: string }>;
  };
}

export interface WorkflowNode {
  id: string;
  kind: 'trigger' | 'condition' | 'action' | 'wait';
  type: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  label?: string;
}

export interface WorkflowEdge {
  id?: string;
  from: string;
  to: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  entityId?: string;
  entityName?: string;
  status: WorkflowStatus;
  version?: number;
  /** Provided by the platform to every organization: read-only inside an organization. */
  isPlatform?: boolean;
  eventTrigger?: string;
  targetModel?: string;
  definition?: WorkflowDefinition;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowVersion {
  id: string;
  version: number;
  /** Present when one version is fetched on its own (the list leaves the steps out). */
  definition?: WorkflowDefinition | null;
  /** Who saved it (email), when the app knew. */
  createdBy?: string | null;
  createdAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: string;
  triggerEvent?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
  pausedAtNodeId?: string | null;
  definitionVersion?: number;
  /** The workflow's version now — differs from definitionVersion once it has been edited since. */
  currentVersion?: number | null;
  /** The steps as they were for this run, so each step reads by its label. */
  definition?: WorkflowDefinition | null;
  /** The record (or payload) that started the run. */
  triggerData?: unknown;
  steps?: WorkflowRunStep[];
  context?: Record<string, unknown>;
}

/** Token usage the engine reports for AI steps (Wave D). Cost is absent when the provider has no price list. */
export interface RunUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

/** "AI: 2 calls, 3.1k tokens ≈ $0.01" — one line, cost omitted when unknown. */
export function formatUsage(usage?: RunUsage | null): string | null {
  if (!usage || !usage.calls) return null;
  const tokens = (usage.inputTokens || 0) + (usage.outputTokens || 0);
  const tok = tokens >= 1000 ? (tokens / 1000).toFixed(1) + 'k' : String(tokens);
  const cost = typeof usage.costUsd === 'number' ? ' ≈ $' + usage.costUsd.toFixed(usage.costUsd < 0.01 ? 4 : 2) : '';
  return 'AI: ' + usage.calls + ' call' + (usage.calls === 1 ? '' : 's') + ', ' + tok + ' tokens' + cost;
}

/** Mirrors the WorkflowTask row as the admin console lists it. */
export interface WorkflowTask {
  id: string;
  runId: string;
  workflowId?: string;
  workflowName?: string;
  nodeId?: string;
  title: string;
  instructions?: string | null;
  assigneeSpec?: string | null;
  assigneeUserIds?: number[];
  assigneeNames?: string[];
  status: string;
  dueAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface RunListQuery {
  status?: string;
  workflowId?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskListQuery {
  status?: string;
  workflowId?: string;
  assignee?: string;
}

function dropEmpty(q: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== null) out[k] = v;
  return out;
}

export interface WorkflowRunStep {
  id: string;
  nodeId: string;
  nodeKind: string;
  nodeType?: string;
  status: string;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  durationMs?: number;
  executedAt?: string;
}

const BASE = '/api/workflow';

/** One endpoint of this app's own API, offered by the integration/app-api pulse. */
export interface ApiEndpoint {
  method: string;
  path: string;
  tag: string;
  summary: string;
  operationId?: string;
  hasBody: boolean;
  // Request-body property names and query-param names for this endpoint, used to
  // auto-scaffold the Body / Query mappers when the endpoint is picked.
  bodyFields?: string[];
  queryParams?: string[];
}

/**
 * Pulse-side endpoints the configuration modal calls: the endpoint catalogue for
 * the app-api field, and sample data for the input preview.
 */
export const pulseService = {
  async apiCatalog(): Promise<ApiEndpoint[]> {
    const { data } = await api.get(BASE + '/pulses/api-catalog');
    return Array.isArray(data) ? data : (data?.data ?? []);
  },
  async sampleData(entity: string): Promise<Record<string, unknown>> {
    const { data } = await api.get(BASE + '/pulses/sample-data', { params: { entity } });
    return data && typeof data === 'object' ? data : {};
  },
  // Recent real rows of the entity, to pin one as the tester's trigger data.
  async sampleRecords(entity: string, limit = 8): Promise<Array<Record<string, unknown>>> {
    const { data } = await api.get(BASE + '/pulses/sample-records', { params: { entity, limit } });
    return Array.isArray(data) ? data : (data?.data ?? []);
  },
  // What a run of this trigger starts with — built on the server by the same function the live
  // entry points use, so Simulate and Test flow match a real run.
  async triggerInput(body: {
    workflowId?: string;
    trigger: { type: string; config?: Record<string, unknown> };
    entity?: string;
    prefer?: 'auto' | 'lastRun' | 'sample';
    given?: unknown;
  }): Promise<TriggerInputResult> {
    const { data } = await api.post(BASE + '/pulses/trigger-input', body);
    return data;
  },
  // A schema-accurate sample record — the empty-DB fallback the designer can edit.
  async sampleSkeleton(entity: string): Promise<Record<string, unknown>> {
    const { data } = await api.get(BASE + '/pulses/sample-skeleton', { params: { entity } });
    return data && typeof data === 'object' ? data : {};
  },
  // Run ONE pulse for real with the given upstream
  // variables, returning its output — powers a node's "Test step".
  async testNode(
    type: string,
    config: Record<string, unknown>,
    variables: Record<string, unknown>,
    /** A Wait being tested can then be skipped / stopped by this id. */
    runId?: string,
  ): Promise<{ status: string; output: Record<string, unknown>; error: string | null }> {
    const { data } = await api.post(BASE + '/pulses/test-node', { type, config, variables, runId });
    return data;
  },
};

/** What the server's import check says about a workflow file (backend workflow-io.service.ts). */
export interface ImportCheck {
  ok: boolean;
  workflow: { name: string; description?: string; entityName: string; steps: number } | null;
  problems: Array<{ level: 'error' | 'warning'; step?: string; message: string }>;
}

const workflowService = {
  /** Check a workflow file against this app. Creates nothing. */
  async checkImport(file: unknown): Promise<ImportCheck> {
    const { data } = await api.post(BASE + '/import/check', { file });
    return data;
  },

  /** Import a workflow file as a Draft. */
  async importWorkflow(file: unknown, name?: string): Promise<{ workflow: { id: string; name: string; status: string }; problems: ImportCheck['problems'] }> {
    const { data } = await api.post(BASE + '/import', { file, name });
    return data;
  },

  async list(): Promise<Workflow[]> {
    const { data } = await api.get(BASE);
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  async getOne(id: string): Promise<Workflow> {
    const { data } = await api.get(BASE + '/' + id);
    return data;
  },

  async create(payload: Partial<Workflow>): Promise<Workflow> {
    const { data } = await api.post(BASE, payload);
    return data;
  },

  async update(id: string, payload: Partial<Workflow>): Promise<Workflow> {
    const { data } = await api.patch(BASE + '/' + id, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(BASE + '/' + id);
  },

  async activate(id: string): Promise<Workflow> {
    const { data } = await api.post(BASE + '/' + id + '/activate');
    return data;
  },

  async deactivate(id: string): Promise<Workflow> {
    const { data } = await api.post(BASE + '/' + id + '/deactivate');
    return data;
  },

  async versions(id: string): Promise<WorkflowVersion[]> {
    const { data } = await api.get(BASE + '/' + id + '/versions');
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  async version(id: string, versionId: string): Promise<WorkflowVersion> {
    const { data } = await api.get(BASE + '/' + id + '/versions/' + versionId);
    return data;
  },

  async rollback(id: string, versionId: string): Promise<Workflow> {
    const { data } = await api.post(BASE + '/' + id + '/rollback/' + versionId);
    return data;
  },

  async test(
    id: string,
    triggerData: Record<string, unknown>,
    runId?: string,
    taskAnswers?: Record<string, Record<string, unknown>>,
  ): Promise<unknown> {
    const { data } = await api.post(BASE + '/' + id + '/test', { triggerData, runId, taskAnswers });
    return data;
  },

  /** Test flow in the background (the designer): returns at once; the result comes as test.done. */
  async startTest(
    /** Null for a workflow that has never been saved: its canvas is tested as it is. */
    id: string | null,
    triggerData: Record<string, unknown>,
    runId: string,
    taskAnswers?: Record<string, Record<string, unknown>>,
    /** The canvas as it is now, saved or not: what the test runs. */
    definition?: WorkflowDefinition,
    /** The target table, for a canvas that has never been saved. */
    entityName?: string,
  ): Promise<{ runId: string; status: string }> {
    const body = { triggerData, runId, taskAnswers, background: true, definition };
    const { data } = id
      ? await api.post(BASE + '/' + id + '/test', body)
      : await api.post(BASE + '/test-draft', { ...body, entityName });
    return data;
  },

  async testResult(runId: string): Promise<{ status: 'running' } | { status: 'done'; result: unknown }> {
    const { data } = await api.get(BASE + '/test-runs/' + encodeURIComponent(runId));
    return data;
  },

  async skipTestWait(runId: string): Promise<void> {
    await api.post(BASE + '/test-runs/' + encodeURIComponent(runId) + '/skip-wait');
  },

  async cancelTest(runId: string): Promise<void> {
    await api.post(BASE + '/test-runs/' + encodeURIComponent(runId) + '/cancel');
  },

  // Runs & Incidents (Wave D). The list is paged; incidents are FAILED plus interrupted runs.
  async listRuns(query: RunListQuery = {}): Promise<{ items: WorkflowRun[]; total: number }> {
    const { data } = await api.get(BASE + '/runs', { params: dropEmpty(query) });
    return { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total ?? 0) };
  },

  async incidents(): Promise<{ items: WorkflowRun[]; total: number }> {
    const { data } = await api.get(BASE + '/runs/incidents');
    return { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total ?? 0) };
  },

  async cancelRun(runId: string): Promise<{ id: string; status: string }> {
    const { data } = await api.post(BASE + '/runs/' + runId + '/cancel');
    return data;
  },

  async retryRun(runId: string): Promise<{ id: string; status: string }> {
    const { data } = await api.post(BASE + '/runs/' + runId + '/retry');
    return data;
  },

  async runs(id: string): Promise<WorkflowRun[]> {
    const { data } = await api.get(BASE + '/' + id + '/runs');
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  async run(runId: string): Promise<WorkflowRun> {
    const { data } = await api.get(BASE + '/runs/' + runId);
    return data;
  },

  async catalog(): Promise<unknown> {
    const { data } = await api.get(BASE + '/meta/catalog');
    return data;
  },
};

/** The admin task console (Wave D): every task, not just the caller's inbox. */
export const taskAdminService = {
  async list(query: TaskListQuery = {}): Promise<{ items: WorkflowTask[]; total: number }> {
    const { data } = await api.get('/api/workflow-tasks/admin', { params: dropEmpty(query) });
    return { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total ?? 0) };
  },
  async reassign(id: string, target: { userIds?: number[]; role?: string }): Promise<WorkflowTask> {
    const { data } = await api.post('/api/workflow-tasks/' + id + '/reassign', target);
    return data;
  },
  async claim(id: string): Promise<WorkflowTask> {
    const { data } = await api.post('/api/workflow-tasks/' + id + '/claim');
    return data;
  },
  async cancel(id: string): Promise<WorkflowTask> {
    const { data } = await api.post('/api/workflow-tasks/' + id + '/cancel');
    return data;
  },
};

export default workflowService;
