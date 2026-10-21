/**
 * What the designer derives from a catalogue entry: the branches a node can take
 * (one source handle each), whether it may carry an `error` edge, whether it is a
 * loop head, and the config defaults a fresh node starts with.
 *
 * Pure — no React, no fetch — so the save validator and the canvas share one
 * answer, and the module can be unit-tested straight from the emitted output.
 *
 * The catalogue (GET /api/workflow/meta/catalog) is the source of truth:
 * `branches`, `dynamicBranches`, `loop` and `errorEdge` on each pulse entry. An
 * older backend omits them, so every reader below falls back to the pulse TYPE
 * and derives the same values — the designer must not go blind on a stale app.
 */

/** The subset of a catalogue pulse entry these helpers read. */
export interface BranchSource {
  type?: string;
  category?: string;
  kind?: string;
  /** Fixed outcomes, e.g. a user task's completed/overdue. */
  branches?: string[];
  /** Fixed outcomes that fire only for a config value (a user task's overdue needs onOverdue = escalate). */
  optionalBranches?: Record<string, BranchGate>;
  /** 'cases' when the branches are named in config.cases[].branch + config.default. */
  dynamicBranches?: 'cases' | null;
  /** A loop head: its body may edge back into it. */
  loop?: boolean;
  /** The node may carry an outgoing edge labelled 'error'. */
  errorEdge?: boolean;
  /** The pulse's field descriptors ({ key, type, required?, default?, ... }), as the catalogue serves them. */
  config?: Array<Record<string, any>>;
}

export interface Branch {
  id: string;
  label: string;
}

/**
 * When an optional branch can fire, as the catalogue serves it: config[key] (or `default` when
 * unset) equals `equals`, AND every `also` entry holds the same way. Mirrors core/branches.ts.
 */
export interface BranchGate {
  key: string;
  equals: string;
  default?: string;
  also?: Array<{ key: string; equals: string; default?: string }>;
}

/** The edge label the engine reserves for business/technical failures. */
export const ERROR_BRANCH = 'error';

const STATIC_BY_TYPE: Record<string, string[]> = {
  'human.userTask': ['completed', 'overdue'],
  'time.wait': ['timeout'],
  'control.forEach': ['body', 'done'],
  'control.whileLoop': ['body', 'done'],
};
/**
 * The gates an older backend does not send, by type — the same switches and defaults the engine
 * applies: a task's overdue only when onOverdue = escalate; a wait's timeout only for a condition
 * wait whose onTimeout = timeout (opt-in: it defaults to stopping the run).
 */
const GATES_BY_TYPE: Record<string, Record<string, BranchGate>> = {
  'human.userTask': { overdue: { key: 'onOverdue', equals: 'escalate', default: 'continue' } },
  'time.wait': {
    timeout: { key: 'onTimeout', equals: 'timeout', default: 'fail', also: [{ key: 'mode', equals: 'condition', default: 'duration' }] },
  },
};
const DYNAMIC_TYPES = new Set(['control.exclusiveGateway', 'control.inclusiveGateway', 'control.switch']);
const LOOP_TYPES = new Set(['control.forEach', 'control.whileLoop']);
/** Control pulses that route or end, and so never raise an error a branch could catch. */
const NO_ERROR_EDGE_TYPES = new Set([
  'control.exclusiveGateway',
  'control.inclusiveGateway',
  'control.switch',
  'control.parallelSplit',
  'control.parallelJoin',
  'control.log',
  'control.endSuccess',
  'control.endError',
  'control.terminate',
]);

/** Steps that finish the run. Nothing can follow them, so they have no outlet and no "+". */
export const TERMINAL_TYPES = new Set(['control.endSuccess', 'control.endError', 'control.terminate']);

export function isTerminal(entry: BranchSource | null | undefined): boolean {
  return TERMINAL_TYPES.has(String(entry?.type ?? ''));
}

function isTrigger(entry: BranchSource | null | undefined): boolean {
  return entry?.category === 'trigger' || entry?.kind === 'trigger' || String(entry?.type ?? '').startsWith('trigger.');
}

/** Every fixed outcome the pulse declares (or, on an older backend, is known to have), gated or not. */
export function declaredBranchesFor(entry: BranchSource | null | undefined): string[] {
  if (Array.isArray(entry?.branches)) return entry!.branches.filter((b) => typeof b === 'string' && b.trim());
  return STATIC_BY_TYPE[String(entry?.type ?? '')] ?? [];
}

/** Does this gate hold for the node's config? An unset switch takes the gate's default. */
function gateHolds(gate: BranchGate, config: Record<string, any> | null | undefined): boolean {
  const holds = (g: { key: string; equals: string; default?: string }) => String(config?.[g.key] ?? g.default ?? '') === g.equals;
  return holds(gate) && (gate.also ?? []).every(holds);
}

/**
 * The fixed outcomes that can fire with THIS config: a gated one (a task's overdue, a wait's
 * timeout) is left out while its switch is off, so the canvas draws no handle for it and the
 * validator demands no edge the run could never take. Gates come from the manifest, or from
 * GATES_BY_TYPE when the backend sends none.
 */
export function staticBranchesFor(entry: BranchSource | null | undefined, config?: Record<string, any> | null): string[] {
  const gates = entry?.optionalBranches ?? GATES_BY_TYPE[String(entry?.type ?? '')] ?? {};
  return declaredBranchesFor(entry).filter((b) => {
    const gate = gates[b];
    return !gate || gateHolds(gate, config);
  });
}

/** Whether the node names its branches itself, in config. */
export function dynamicBranchKind(entry: BranchSource | null | undefined): 'cases' | null {
  if (entry && entry.dynamicBranches !== undefined) return entry.dynamicBranches ?? null;
  return DYNAMIC_TYPES.has(String(entry?.type ?? '')) ? 'cases' : null;
}

export function isLoop(entry: BranchSource | null | undefined): boolean {
  if (typeof entry?.loop === 'boolean') return entry.loop;
  return LOOP_TYPES.has(String(entry?.type ?? ''));
}

/** True when the node may carry an outgoing edge labelled 'error'. Triggers never do. */
export function hasErrorEdge(entry: BranchSource | null | undefined): boolean {
  if (!entry || isTrigger(entry)) return false;
  if (typeof entry.errorEdge === 'boolean') return entry.errorEdge;
  return !NO_ERROR_EDGE_TYPES.has(String(entry.type ?? ''));
}

/** Branch names typed into a gateway/switch config: cases[].branch then default. */
export function configBranchNames(config: Record<string, any> | null | undefined): string[] {
  const names: string[] = [];
  const cases = Array.isArray(config?.cases) ? config!.cases : [];
  for (const c of cases) if (c && typeof c.branch === 'string' && c.branch.trim()) names.push(c.branch.trim());
  if (typeof config?.default === 'string' && config.default.trim()) names.push(config.default.trim());
  return names;
}

function labelFor(id: string): string {
  return id === 'true' ? 'Yes' : id === 'false' ? 'No' : id;
}

/**
 * Every branch a node can leave on, in handle order: fixed outcomes first, then the
 * names typed into config. Unique. A gateway with no names yet is the legacy
 * Yes/No pair, so an untouched condition still has two handles to wire.
 */
export function branchesFor(entry: BranchSource | null | undefined, config?: Record<string, any> | null): Branch[] {
  const names = [...staticBranchesFor(entry, config)];
  if (dynamicBranchKind(entry) === 'cases') {
    names.push(...configBranchNames(config));
    if (names.length === 0) names.push('true', 'false');
  }
  const unique = names.filter((n, i) => names.indexOf(n) === i && n !== ERROR_BRANCH);
  return unique.map((id) => ({ id, label: labelFor(id) }));
}

/**
 * Whether the node also has a plain, unlabelled continuation.
 *
 * A gateway/switch and a loop route ONLY on named branches; a user task's outcomes are
 * both named too (an unlabelled edge there would make overdue look like completed). A
 * wait, on the other hand, continues unlabelled when the time is up and takes
 * 'timeout' only when its condition never came true.
 */
/** Steps that always fail: the error path is their only way out, so they have no plain outlet. */
export const ALWAYS_FAILS = new Set(['control.throwError']);

export function hasDefaultFlow(entry: BranchSource | null | undefined): boolean {
  if (isTerminal(entry)) return false;
  if (ALWAYS_FAILS.has(String(entry?.type ?? ''))) return false;
  if (dynamicBranchKind(entry) !== null) return false;
  if (isLoop(entry)) return false;
  return !declaredBranchesFor(entry).includes('completed');
}

/** Config values a fresh node starts with: every descriptor's declared default. */
export function configDefaults(entry: BranchSource | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of entry?.config ?? []) {
    if (f && typeof f.key === 'string' && f.default !== undefined) out[f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
  }
  return out;
}

/** The node's config with declared defaults filled in underneath what is already set. */
export function withDefaults(entry: BranchSource | null | undefined, config?: Record<string, unknown> | null): Record<string, unknown> {
  return { ...configDefaults(entry), ...(config ?? {}) };
}

/**
 * Adopt legacy unlabelled edges onto a node's sole outstanding branch.
 *
 * Before every outcome had a handle, a User Task's only edge left it unlabelled; the engine
 * still follows it (a branch with no matching edge falls back to the unlabelled ones). The
 * save check now asks for the "completed" label, so a drawing made under the old designer
 * would be refused for something the engine already does. When a node has NO plain
 * continuation and exactly ONE of its branches has no edge, its unlabelled edges are that
 * branch: label them. Anything ambiguous (two missing branches, or a node with a default
 * flow) is left alone for the validator to name.
 */
export function adoptSoleBranch<T extends { from: string; to: string; condition?: string }>(
  nodes: Array<{ id: string; type?: string; config?: Record<string, any> | null }>,
  edges: T[],
  lookup?: (type: string) => BranchSource | null | undefined,
): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    if (e.condition) return e;
    const node = byId.get(e.from);
    if (!node || !node.type) return e;
    const entry = (lookup && lookup(node.type)) || ({ type: node.type } as BranchSource);
    if (hasDefaultFlow(entry)) return e;
    const labelled = new Set(edges.filter((x) => x.from === e.from && x.condition).map((x) => x.condition as string));
    const missing = branchesFor(entry, node.config).map((br) => br.id).filter((id) => !labelled.has(id));
    if (missing.length !== 1) return e;
    return { ...e, condition: missing[0] };
  });
}
