/**
 * Pulses — the workflow engine's node library (successor to the legacy "nodes").
 *
 * Each Pulse is a self-contained unit:
 *   - declarative METADATA + CONFIG + I/O  → its "properties"/configurator, which
 *     also drives the designer (rendered generically from these descriptors), and
 *   - a dedicated, PURE EXECUTOR (`execute(inputs, ctx) -> outputs`).
 *
 * Cross-cutting concerns (retry, timeout, onError, input/output mapping,
 * idempotency, logging) live in the shared wrapper (run-pulse.ts) — NEVER inside
 * a Pulse. CRM/domain behaviour lives in dedicated `domain/*` pulses, not smuggled
 * into generic primitives (the leak we are eliminating).
 *
 * Built make-before-break: runs on a PARALLEL interpreter, touches none of the
 * legacy engine. Workflows migrate onto it later, upon success.
 */

export type PulseCategory =
  | 'trigger'
  | 'control'
  | 'data'
  | 'time'
  | 'human'
  | 'integration'
  /** Steps that call a configured Agent. Its own category because "it may cost money and its
   *  output is not deterministic" is the one property a designer must be able to see at a
   *  glance, and burying an agent among the Data pulses hides exactly that. */
  | 'ai'
  | 'script'
  | 'domain';

/** Per-pulse async policy (Step 0, Decision 1). Enforced by the wrapper/host,
 *  never by the pulse itself. */
export type AsyncPolicy = 'never' | 'always' | 'auto';

/** A single configurable property of a Pulse. The array of these IS the pulse's
 *  configurator; it serializes into the designer manifest so the properties panel
 *  renders generically (no bespoke inspector per pulse). */
export interface PulseFieldDescriptor {
  key: string;
  label: string;
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'select'
    | 'expression'
    | 'entity'
    | 'recipient'
    | 'json'
    | 'code';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** Hint mapping to a bespoke designer widget (e.g. reuse RecipientField /
   *  VariableField). Absent → default control for `type`. */
  widget?: string;
  default?: unknown;
  help?: string;
  /** Reach the executor RAW, templates unresolved — for fields that hold expressions the
   *  executor evaluates against the run variables itself (a gateway's `cases`). Substituting
   *  first turns a missing value into `== 'approve'` (unparseable) and a value with spaces or
   *  quotes into a different expression. `expression`-typed fields are always raw. */
  rawTemplates?: boolean;
  /** Shown only while another setting has one of these values (e.g. a Wait's fields per mode).
   *  The setting's own default counts when it is unset. Display only: the executor still checks. */
  showWhen?: { key: string; is: string[] };
}

/** Declared inputs (variables read) and outputs (variables written). Surfaced in
 *  the designer so data flow is visible — closes the standing I/O UX gap. */
export interface PulseIO {
  inputs: Array<{ key: string; label: string; description?: string }>;
  outputs: Array<{ key: string; label: string; description?: string }>;
}

export interface PulseMeta {
  /** Namespaced, stable identifier — e.g. `data.createRecord`. Namespacing keeps
   *  pulse types from ever colliding with legacy bare types (`mutateData`). */
  type: string;
  category: PulseCategory;
  label: string;
  /** Short one-liner; the full explanation ships in the pulse's `.doc.md`. */
  description: string;
  icon?: string;
  async: AsyncPolicy;
  /** True if execute performs side effects → the wrapper enforces replay-safety
   *  (idempotency) on retry/resume. */
  hasSideEffects: boolean;
  /** Interpreter-level join hint. 'and' → the interpreter waits for a token on
   *  every incoming edge before firing (parallel/AND join). */
  join?: 'and';
  /** Interpreter-level loop hint. The interpreter drives iteration, routing a
   *  token onto the `body` edge each pass and the `done` edge when finished.
   *  Truthy = the graph validator allows a cycle that passes through this node. */
  loop?: 'forEach' | 'while';
  /**
   * Branch contract — the outcomes this pulse routes on, besides the unlabeled default flow.
   * The designer renders one handle per branch; the graph validator requires an edge per branch.
   *
   * `branches` are fixed labels the executor (or the interpreter) emits: a User Task resumes on
   * `completed` or `overdue`, a loop routes `body` / `done`. `dynamicBranches: 'cases'` means the
   * labels come from the node's own config (`cases[].branch` plus `default`), as a gateway's do.
   * Every label must be exactly what the engine routes on — see core/branches.ts.
   */
  branches?: string[];
  dynamicBranches?: 'cases' | null;
  /**
   * A fixed branch that only fires when a config field holds a value — `overdue` exists only when
   * `onOverdue` is `escalate`. The designer still shows the handle; the validator only demands an
   * edge when the branch can actually be taken. `default` is what the executor assumes when the
   * field is unset, so the gate and the executor cannot disagree.
   */
  optionalBranches?: Record<string, BranchGate>;
  /**
   * Triggers only: what a run of this trigger STARTS WITH, and where that comes from. One
   * declaration drives the live entry point, Test flow and the designer's Simulate alike
   * (core/trigger-input.ts), so a test can never be shaped differently from a real run.
   */
  triggerInput?: TriggerInputSpec;
}

/**
 * Where a trigger's run input comes from:
 *  - `record` — a row of the workflow's table (created / updated / deleted / started by hand).
 *    A designer may test with a real row.
 *  - `call`   — an inbound HTTP call (method, headers, query, body). Never a table row.
 *  - `clock`  — a schedule tick (when it fired, by which schedule). Never a table row.
 *  - `form`   — details someone submitted (a sign-up). Never a table row.
 *  - `workflow` — what another workflow's Call Workflow step passed (under `input`), shaped by
 *    the trigger's declared inputs (core/workflow-inputs). Never a table row.
 */
export type TriggerInputSource = 'record' | 'call' | 'clock' | 'form' | 'workflow';

export interface TriggerInputField {
  key: string;
  label: string;
  type?: 'string' | 'email';
  required?: boolean;
  /** What a test uses when the designer typed nothing. */
  example: string;
}

export interface TriggerInputSpec {
  source: TriggerInputSource;
  /** WorkflowRun.triggerEvent of a REAL run of this trigger: "use the last real run" reads only these. */
  event: string;
  /** `form` only: the variable the submitted details arrive under (signUp → {{signUp.email}}),
   *  the fields a designer types for a test, and the key stamped with the time it was sent. */
  form?: { key: string; fields: TriggerInputField[]; stampedAt?: string };
  /** Variables a real run carries that nobody may read or type (an already-hashed password).
   *  A test, and anything shown in the designer, gets a placeholder that matches nothing. */
  secret?: string[];
}

/**
 * When an optional branch can fire: `config[key]` (or `default` when unset) equals `equals`, AND
 * every entry of `also` holds the same way. `also` exists because one switch is not always the
 * whole story — a wait's `timeout` needs `onTimeout = 'timeout'` AND `mode = 'condition'`; a
 * duration wait has no deadline, so demanding a timeout edge on it was a wiring error nobody
 * could satisfy. Additive: readers that know only key/equals still get the primary switch.
 */
export interface BranchGate {
  key: string;
  equals: string;
  default?: string;
  also?: Array<{ key: string; equals: string; default?: string }>;
}

/** What a pulse executor returns. A pulse emits SIGNALS and output values; it
 *  never mutates context or writes control state directly. */
export interface PulseResult {
  /** Values to merge into workflow variables (via the wrapper's output mapping). */
  outputs?: Record<string, unknown>;
  /** Gateways/routers: the branch label to follow. */
  branch?: string;
  /** Inclusive/multi routing: follow edges for ALL of these branch labels at once. */
  branches?: string[];
  /** Wait pulses: pause the instance until an external signal arrives. */
  /**
   * A durable pause. `task` is distinct from `approval`: an approval yields a
   * decision, a task yields whatever work the assignee produced, and the two
   * resume down different branches.
   */
  wait?: { kind: 'approval' | 'task' | 'condition' | 'timer'; config: Record<string, unknown> };
  /** Named, catchable business error (distinct from a thrown/technical error). */
  error?: { name: string; message: string };
  /** Terminal end pulses: end this branch (or the whole instance). */
  end?: { status: 'success' | 'error'; errorName?: string };
}

/** Data-plane repository access, resolved per entity/model. Minimal for now;
 *  extended as the data-plane wave lands. */
export interface PulseRepository {
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  findUnique(where: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  count(args: Record<string, unknown>): Promise<number>;
  update(where: Record<string, unknown>, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(where: Record<string, unknown>): Promise<Record<string, unknown>>;
  /**
   * Prisma-shaped groupBy: `{ by, where?, _count?, _sum?, _avg?, _min?, _max?, orderBy?, take? }`.
   *
   * Added for the agent's query tool. "How many open tickets per team" is one of the most common
   * things a user asks, and answering it with findMany plus counting in JavaScript means loading
   * every row into memory to produce five numbers — which stops working at exactly the data size
   * where the question becomes worth asking.
   */
  groupBy(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  /** Prisma-shaped aggregate: `{ where?, _count?, _sum?, _avg?, _min?, _max? }`. */
  aggregate(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** The service surface injected into every pulse. Pulses call these ports rather
 *  than touching Prisma / nodemailer / fetch directly — keeps executors pure and
 *  unit-testable, and keeps domain wiring in one place. Extended per wave. */
export interface PulseServices {
  repo: (entity: string) => PulseRepository;
  /** Tests only: a Wait sleeps here exactly as long as a live run would, shown to the designer
   *  (`show.until` / `show.label`) — unless Skip ends it early ('skipped') or Stop rejects it
   *  (TestStopped). */
  testWait?: (ms: number, show?: { until: number; label?: string }) => Promise<'elapsed' | 'skipped'>;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
  /** Perform an outbound HTTP request. Optional capability (used by the HTTP
   *  Request pulse); keeps executors free of a concrete HTTP client. */
  http?: (req: PulseHttpRequest) => Promise<PulseHttpResponse>;
  /** Send an email. When `smtp` is provided the impl uses it; otherwise it falls
   *  back to the system SMTP config (the .env variables). */
  /**
   * G5 — returns what actually happened. A void signature forced the executor to
   * assume success, so a failed send was reported as sent. Implementations MUST
   * throw when delivery genuinely fails.
   */
  sendEmail?: (e: PulseEmail) => Promise<{ sent: boolean; via: string }>;
  /** Emit an in-app notification onto the app's notification queue; the app's
   *  websocket listener delivers it to the recipient. Returns how many people it was queued for,
   *  so a step that reached nobody says so instead of reporting success. (void = not counted.) */
  notify?: (n: PulseNotification) => Promise<{ recipients: number } | void>;
  /**
   * Email somebody a single-use link to set their own password. Optional capability, like `http`:
   * the live host implements it, the sandbox does not, and the Create User Account step says so
   * plainly in invite mode rather than creating an account nobody can ever sign in to.
   *
   * The token itself never comes back — it exists in the mailbox it was sent to and nowhere else,
   * so a run's recorded output cannot become a working credential.
   */
  invite?: (input: { userId: number | string; email: string }) => Promise<{
    sent: boolean;
    expiresAt?: string;
  }>;
  /**
   * Run another workflow as a step of this one. Optional capability (used by the
   * Call Workflow pulse).
   *
   * Without it, shared logic has to be copied into every workflow that needs it,
   * and a change has to be made in every copy. `depth` is passed so the host can
   * refuse runaway recursion — a workflow that calls itself would otherwise loop
   * until the interpreter's step cap, with no useful error.
   */
  runWorkflow?: (req: {
    workflowId?: string;
    workflowName?: string;
    variables: Record<string, unknown>;
    depth: number;
    /** "Attempt to convert types": a called workflow's typed inputs accept "42" for a number. */
    convertTypes?: boolean;
  }) => Promise<{ status: string; runId: string; variables?: Record<string, unknown> }>;
  /**
   * Run a configured Agent as a step of this workflow. Optional capability, like `http` — an app
   * with no AI provider configured simply does not have it, and the pulse says so plainly instead
   * of failing somewhere inside a model client.
   *
   * READ-ONLY by construction (Phase 3 scope): the agent is given the app's read tools only, and
   * returns a typed result. Anything that changes data is done by the WORKFLOW, through the
   * create/update/delete pulses that already exist and are already audited.
   */
  agent?: (req: PulseAgentRequest) => Promise<PulseAgentResult>;
  /**
   * Run one action of an enabled connector (Gmail, Oracle, SAP Ariba…) with one of the app's
   * connections. Optional capability: the live host delegates to src/connectors/connector-runtime
   * (which holds the decrypted secret — the pulse never sees it). Test runs use it too.
   */
  connector?: (req: PulseConnectorRequest) => Promise<unknown>;
}

export interface PulseConnectorRequest {
  connector: string;
  action: string;
  /** A ConnectorConnection id — never a secret. */
  connection: number | string;
  props: Record<string, unknown>;
}

export interface PulseAgentRequest {
  /** The Agent row to run — its id, or its name for a hand-written definition. */
  agentId?: string;
  agentName?: string;
  /** What to ask it, templates already resolved by the wrapper. */
  task: string;
  /** false turns the agent's web search off for this step. Undefined follows the agent's row. */
  webSearch?: boolean;
  /**
   * Whose permissions the agent works under.
   *
   * An agent can only ever see LESS than this person can (plan 3.2). A workflow started by a
   * record change already has an actor; one started by a schedule or a webhook has none, which is
   * why this exists — the designer names the user on the node. Unset and with no triggering user,
   * the step fails rather than guessing, because every way of guessing here ends in an agent
   * reading something nobody granted it.
   */
  runAs?: string;
  /** Hard ceiling on model round-trips for THIS step, below the agent's own setting. */
  maxIterations?: number;
  /**
   * A JSON schema for THIS call's answer. When set on the step it replaces the agent row's own
   * outputSchema for the call, so one agent can answer two steps in two shapes.
   */
  outputSchema?: unknown;
}

export interface PulseAgentResult {
  /** The agent's answer in prose. Always present. */
  answer: string;
  /**
   * The parsed answer, when the agent declares an `outputSchema`. A gateway branches on a field
   * of this — never on `answer`, which is a sentence and will be reworded by the next model.
   */
  result?: unknown;
  /** Tool names the agent actually called, in order. The audit trail, on the canvas. */
  toolsUsed: string[];
  /** Tokens spent by this call; `calls` is the number of model round-trips it took. */
  usage?: { inputTokens: number; outputTokens: number; calls?: number };
}

export interface PulseEmail {
  to: string;
  subject: string;
  html?: string;
  cc?: string;
  bcc?: string;
  from?: string;
  /** Optional call-to-action button rendered by the branded shell (e.g. a secure link). */
  cta?: { url: string; label: string };
  /** Optional per-send SMTP override; blank fields fall back to the system SMTP. */
  smtp?: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean };
}

export interface PulseNotification {
  to?: string;
  title: string;
  message: string;
  level?: string;
  entity?: string;
  entityId?: string | number;
}

export interface PulseHttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface PulseHttpResponse {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
}

/** Runtime context handed to a pulse executor. `variables` is a read-only
 *  snapshot — the wrapper applies output mapping; pulses never mutate it. */
export interface PulseContext {
  variables: Readonly<Record<string, unknown>>;
  /** Every pulse runs inside a scope (Step 0, Decision 2). Boundary events later
   *  attach to a scopeId, not a node id. A lone node is a scope of one. */
  scopeId: string;
  services: PulseServices;
  run: { id: string; workflowId: string; organizationId?: number };
  /** Test runs must not perform real side effects. */
  isTest: boolean;
  /** The id of the node being executed. Lets a step find per-node test input (Wave D). */
  nodeId?: string;
}

/** The contract every pulse's executor satisfies. PURE: no retry, no logging of
 *  its own, no direct variable mutation — all handled by the wrapper. */
export type PulseExecutor = (
  inputs: Record<string, unknown>,
  ctx: PulseContext,
) => Promise<PulseResult>;

/** A fully-assembled Pulse: declarative properties + dedicated executor. */
export interface Pulse {
  meta: PulseMeta;
  config: PulseFieldDescriptor[];
  io: PulseIO;
  execute: PulseExecutor;
}

/** The serialized, execute-free view of a Pulse — what the designer manifest
 *  ships to the client to render palette + properties + I/O. */
export interface PulseManifestEntry {
  meta: PulseMeta;
  config: PulseFieldDescriptor[];
  io: PulseIO;
}
