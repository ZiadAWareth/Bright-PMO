import type { PulseMeta } from './pulse.contract';

/**
 * The branch contract, in one place, so the designer, the graph validator and the AI's
 * validator all agree on which labels a node routes on.
 *
 * The interpreter matches an edge's `condition` against the label a pulse emits, exactly and
 * case-sensitively (`outgoing()` in pulse-interpreter.ts). A handle drawn under any other name
 * is an edge the engine never follows, which is how "overdue = completed" happened: without a
 * labelled edge every unlabeled edge is taken.
 */

/** End nodes finish the run; nothing leaves them, so an `error` edge on one is a drawing mistake. */
const END_TYPES = new Set(['control.endSuccess', 'control.endError', 'control.terminate']);

const clean = (labels: unknown[]): string[] => {
  const out: string[] = [];
  for (const l of labels) {
    if (typeof l !== 'string') continue;
    const t = l.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
};

/** Labels computed from the node's own config: `cases[].branch` plus `default`. */
function dynamicBranches(meta: PulseMeta, config: Record<string, unknown> | undefined): string[] {
  if (meta.dynamicBranches !== 'cases') return [];
  const cases = Array.isArray(config?.cases) ? (config!.cases as unknown[]) : [];
  const labels = cases.map((c) => (c && typeof c === 'object' ? (c as { branch?: unknown }).branch : undefined));
  labels.push(config?.default);
  return clean(labels);
}

/**
 * Every branch the designer may draw for this node: the fixed ones (including optional ones,
 * whether or not their config switch is on) plus the computed ones. Use for "is this edge label
 * one the node knows about".
 */
export function declaredBranches(meta: PulseMeta, config?: Record<string, unknown>): string[] {
  return clean([...(meta.branches ?? []), ...dynamicBranches(meta, config)]);
}

/**
 * The branches that can actually fire with THIS config — what a saved graph must wire. An
 * optional branch (`overdue` with `onOverdue: 'continue'`) is left out, so the validator does not
 * demand an edge the run could never take.
 */
export function branchesFor(meta: PulseMeta, config?: Record<string, unknown>): string[] {
  const gates = meta.optionalBranches ?? {};
  const holds = (g: { key: string; equals: string; default?: string }) =>
    String(config?.[g.key] ?? g.default ?? '') === g.equals;
  const fixed = (meta.branches ?? []).filter((b) => {
    const gate = gates[b];
    return !gate || (holds(gate) && (gate.also ?? []).every(holds));
  });
  return clean([...fixed, ...dynamicBranches(meta, config)]);
}

/** May an `error` edge leave this node? Triggers and end nodes never fail into a branch. */
export function acceptsErrorEdge(meta: PulseMeta): boolean {
  return meta.category !== 'trigger' && !END_TYPES.has(meta.type);
}

/** Whether the node also has a plain, unlabelled continuation (a wait, a data step) — as opposed
 *  to routing ONLY on named outcomes (gateways, switch, loops, a user task). */
export function hasDefaultFlow(meta: PulseMeta): boolean {
  if (meta.dynamicBranches === 'cases') return false;
  if (meta.loop) return false;
  return !(meta.branches ?? []).includes('completed');
}

/**
 * Adopt legacy unlabelled edges onto a node's sole outstanding outcome.
 *
 * The engine already treats an unlabelled edge as the fallback for a branch no edge carries, so
 * a User Task drawn before outcomes had handles (one unlabelled edge) runs fine. The validator
 * demands the label, and a spec written as "3 -> 4" makes the assistant emit the same shape.
 * When a node has NO plain continuation and exactly ONE of its outcomes is unwired, its
 * unlabelled edges ARE that outcome: label them. Anything ambiguous is left for the validator.
 */
export function adoptSoleBranch<T extends { from: string; to: string; condition?: string }>(
  nodes: Array<{ id: string; type?: string; config?: Record<string, unknown> | null }>,
  edges: T[],
  metaFor: (type: string) => PulseMeta | undefined,
): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    if (e.condition) return e;
    const node = byId.get(e.from);
    const meta = node && node.type ? metaFor(node.type) : undefined;
    if (!meta || hasDefaultFlow(meta)) return e;
    const labelled = new Set(edges.filter((x) => x.from === e.from && x.condition).map((x) => String(x.condition)));
    const missing = branchesFor(meta, node!.config ?? undefined).filter((b) => !labelled.has(b));
    if (missing.length !== 1) return e;
    return { ...e, condition: missing[0] };
  });
}
