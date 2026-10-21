/**
 * The steps that run BEFORE a given step: the only ones whose data it can read.
 *
 * Walked backwards along the connections, from the step to the trigger. A loop's edge back into
 * its head (For Each / While) is left out, or every step later in the loop body would count as
 * "before" the step at its top. A step on a parallel branch is not before this one either: its
 * data is not guaranteed to exist when this step runs.
 */
type E = { source: string; target: string };
type N = { id: string; type?: string };

/** Edges that close a cycle (target is still being explored when reached): a loop's way back. */
function backEdges(nodes: N[], edges: E[]): Set<E> {
  const out = new Map<string, E[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e]);
  const hasIncoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => n.type === 'trigger' || !hasIncoming.has(n.id));
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<E>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const e of out.get(id) ?? []) {
      const s = state.get(e.target);
      if (s === 'open') back.add(e);
      else if (!s) visit(e.target);
    }
    state.set(id, 'done');
  };
  for (const r of roots) if (!state.has(r.id)) visit(r.id);
  for (const n of nodes) if (!state.has(n.id)) visit(n.id);
  return back;
}

/** The ids of every step before `nodeId`, in flow order (the trigger first). */
export function upstreamIds(nodeId: string, nodes: N[], edges: E[]): string[] {
  const back = backEdges(nodes, edges);
  const forward = edges.filter((e) => !back.has(e));
  const incoming = new Map<string, string[]>();
  for (const e of forward) incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source]);
  const seen = new Set<string>();
  const stack = [...(incoming.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || id === nodeId) continue;
    seen.add(id);
    stack.push(...(incoming.get(id) ?? []));
  }
  // Flow order: depth from the start, so the list reads top to bottom like the canvas.
  const depth = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const e of forward) outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  const queue = nodes.filter((n) => !forward.some((e) => e.target === n.id)).map((n) => n.id);
  for (const id of queue) depth.set(id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const t of outgoing.get(id) ?? []) {
      const d = (depth.get(id) ?? 0) + 1;
      if (d > (depth.get(t) ?? -1)) {
        depth.set(t, d);
        queue.push(t);
      }
    }
  }
  return [...seen].sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0));
}
