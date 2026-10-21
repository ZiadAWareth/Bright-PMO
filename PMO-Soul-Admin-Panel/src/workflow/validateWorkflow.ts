/**
 * Graph validation, run BEFORE a workflow is saved (G20).
 *
 * An invalid definition used to persist happily and fail only when it ran — and
 * the failure surfaced far from the edit that caused it. Every check here
 * describes a graph that cannot execute correctly.
 *
 * Catalogue-aware (Wave B): given the pulse catalogue it checks every declared
 * branch (not only an exclusive gateway's), lets a cycle through a loop head,
 * demands required config and a real entity name. Without the catalogue it keeps
 * the structural rules and derives what it can from the pulse type.
 */
import type { BranchSource } from './branches';
import { branchesFor, declaredBranchesFor, hasErrorEdge, isLoop, ERROR_BRANCH, adoptSoleBranch } from './branches';

export interface GraphNode {
  id: string;
  kind?: string;
  type?: string;
  label?: string;
  config?: Record<string, any>;
}

export interface GraphEdge {
  id?: string;
  from: string;
  to: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** What the validator needs from the catalogue: the pulse entries and the entity names. */
export interface ValidationCatalog {
  pulses: BranchSource[];
  entities?: Array<{ name: string } | string>;
}

/**
 * A config value that counts as "not provided": undefined, null, '', or an empty
 * list. A template such as {{record.id}} is a value — it resolves at run time.
 */
export function isConfigValueMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * @param definition the graph about to be saved
 * @param catalog the pulse catalogue (entries + entities), OR — the older form — a Set of node
 *        types the backend has a pulse for. Omit to skip the type, required and entity checks.
 * @param asDefaults pulse type -> the default value of its "store result as" field. Needed because
 *        the DEFAULT is the dangerous case: several steps that were never touched all carry the
 *        same name. Derived from the catalogue when one is given; omit to check only names the
 *        author typed in.
 * @returns human-readable problems; empty means the graph is saveable
 */
export function validateWorkflow(
  definition: WorkflowDefinition,
  catalog?: Set<string> | ValidationCatalog | null,
  asDefaults?: Record<string, string>,
): string[] {
  const errors: string[] = [];
  const nodes = definition?.nodes ?? [];
  const edges = definition?.edges ?? [];

  if (nodes.length === 0) return ['Workflow has no nodes.'];

  const byId = new Map(nodes.map((n) => [n.id, n]));

  // The catalogue may arrive as the entries themselves or, from older callers, as a bare Set of
  // known types. Both feed the same lookups below.
  const entries = new Map<string, BranchSource>();
  let knownTypes: Set<string> | undefined;
  let entityNames: Set<string> | undefined;
  if (catalog instanceof Set) {
    knownTypes = catalog;
  } else if (catalog && Array.isArray(catalog.pulses)) {
    for (const p of catalog.pulses) if (p && typeof p.type === 'string') entries.set(p.type, p);
    knownTypes = new Set(entries.keys());
    if (Array.isArray(catalog.entities)) {
      entityNames = new Set(catalog.entities.map((e) => (typeof e === 'string' ? e : e?.name)).filter(Boolean) as string[]);
    }
    if (!asDefaults) {
      asDefaults = {};
      for (const [type, p] of entries) {
        const field = (p.config ?? []).find((f) => f?.key === 'as');
        if (field && typeof field.default === 'string') asDefaults[type] = field.default;
      }
    }
  }
  const nameOf = (node: GraphNode) => node.label || node.id;
  // A "store result as" that belongs to another mode (showWhen) stores nothing — a Wait counting
  // time writes no watchedRecord, however its hidden field reads. Same rule as the server.
  const asActive = (node: GraphNode): boolean => {
    const cfg = ((node.type ? entries.get(node.type)?.config : undefined) ?? []) as Array<{
      key?: string;
      default?: unknown;
      showWhen?: { key: string; is: string[] };
    }>;
    const f = cfg.find((d) => d?.key === 'as');
    if (!f?.showWhen) return true;
    const ctl = cfg.find((d) => d?.key === f.showWhen!.key);
    return f.showWhen.is.includes(String((node.config as Record<string, unknown> | undefined)?.[f.showWhen.key] ?? ctl?.default ?? ''));
  };
  // The catalogue entry for a node; without a catalogue, a stand-in built from the node so the
  // branch helpers can still derive outcomes from the pulse type (a condition with no type is
  // the legacy Yes/No pair).
  const entryFor = (node: GraphNode): BranchSource | null => {
    if (node.kind === 'trigger') return null;
    const hit = node.type ? entries.get(node.type) : undefined;
    if (hit) return hit;
    if (entries.size > 0) return null;
    return node.kind === 'condition' ? { type: node.type, kind: 'condition', dynamicBranches: 'cases' } : { type: node.type };
  };

  // 1. Exactly one trigger — none means it never fires, several means the entry
  //    point is ambiguous.
  const triggers = nodes.filter((n) => n.kind === 'trigger');
  if (triggers.length === 0) errors.push('Workflow must have a trigger node.');
  if (triggers.length > 1) errors.push('Workflow must have exactly one trigger node.');

  // 2. Something must actually happen.
  if (!nodes.some((n) => n.kind === 'action')) {
    errors.push('Workflow has no action — nothing will happen when it fires.');
  }

  // 3. Every edge must reference nodes that exist. A dangling edge crashes the
  //    interpreter mid-run.
  for (const edge of edges) {
    if (!byId.has(edge.from)) errors.push(`An edge starts from a node that no longer exists ("${edge.from}").`);
    if (!byId.has(edge.to)) errors.push(`An edge points at a node that no longer exists ("${edge.to}").`);
  }

  // 3b. An End step (or Terminate All) finishes the run: a step connected after it could never run.
  const ENDS = new Set(['control.endSuccess', 'control.endError', 'control.terminate']);
  for (const edge of edges) {
    const from = byId.get(edge.from);
    if (from && ENDS.has(String(from.type))) {
      errors.push('"' + (from.label || from.id) + '" ends the workflow, so nothing can follow it. Remove the connection after it.');
    }
  }
  // 3c. Throw Error always fails: only its error path is ever taken, so a plain line after it is dead.
  for (const edge of edges) {
    const from = byId.get(edge.from);
    if (from && from.type === 'control.throwError' && String(edge.condition ?? '').trim() !== 'error') {
      errors.push('"' + (from.label || from.id) + '" always fails, so a plain line after it never runs. Connect its error path instead, or remove the line.');
    }
  }

  // 4. Every node type must be one the engine can execute.
  if (knownTypes && knownTypes.size > 0) {
    for (const node of nodes) {
      if (node.kind === 'trigger' && !node.type) continue;
      if (!node.type) {
        errors.push(`Node "${nameOf(node)}" has no component type, so the engine cannot run it.`);
        continue;
      }
      if (!knownTypes.has(node.type)) {
        errors.push(`Node "${nameOf(node)}" uses "${node.type}", which this app has no component for.`);
      }
    }
  }

  // 5. Every branch a node declares must leave on an edge, or that outcome silently dead-ends:
  //    a gateway/switch names its branches in config, a user task has completed/overdue, a wait
  //    has timeout, a loop has body/done. With no labelled edge the engine follows every
  //    unlabelled one, so an unwired "overdue" would run the "completed" path. And an edge
  //    labelled with a branch the node does not have never fires.
  // Checked on the adopted view: a lone unlabelled edge out of a node with one outstanding outcome
  // is that outcome (the engine runs it so; the modeler labels it on load).
  const adoptedEdges = adoptSoleBranch(nodes as any, edges as any, (t) => (catalog ? entryFor({ id: '', type: t } as any) ?? undefined : undefined));
  for (const node of nodes) {
    const entry = entryFor(node);
    if (!entry) continue;
    const out = adoptedEdges.filter((e) => e.from === node.id);
    const labelled = new Set(out.map((e) => e.condition).filter(Boolean) as string[]);
    const wanted = branchesFor(entry, node.config);
    const noun = node.kind === 'condition' ? 'Condition' : 'Node';
    for (const b of wanted) {
      if (!labelled.has(b.id)) errors.push(`${noun} "${nameOf(node)}" has no "${b.id}" branch.`);
    }
    // A gated outcome whose switch is off is not demanded, but an edge already drawn for it is
    // not a stray either: it simply waits for the switch (and an edge on it never fires meanwhile).
    const allowed = new Set([...wanted.map((b) => b.id), ...declaredBranchesFor(entry)]);
    if (hasErrorEdge(entry)) allowed.add(ERROR_BRANCH);
    for (const label of labelled) {
      if (!allowed.has(label)) {
        errors.push(`${noun} "${nameOf(node)}" has an edge labelled "${label}", but no such branch — it would never fire.`);
      }
    }
  }

  // 6. No cycles — except back into a loop head (For Each / While), which drives the
  //    iteration itself: its body MUST edge back. Any other cycle runs until the step cap.
  //    Removing the loop heads first leaves exactly the cycles that never end.
  const loopHeads = new Set(nodes.filter((n) => isLoop(entryFor(n))).map((n) => n.id));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (loopHeads.has(id)) return false;
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    for (const edge of edges.filter((e) => e.from === id)) {
      if (hasCycle(edge.to)) return true;
    }
    visiting.delete(id);
    done.add(id);
    return false;
  };
  if (nodes.some((n) => hasCycle(n.id))) {
    errors.push('Workflow contains a loop that never ends.');
  }

  // 7. Every node must be reachable from the trigger — anything else is dead
  //    configuration the author probably believes is running.
  if (triggers.length === 1) {
    const reachable = new Set<string>([triggers[0].id]);
    const queue = [triggers[0].id];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const edge of edges.filter((e) => e.from === current)) {
        if (!reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`Node "${nameOf(node)}" is not connected to the trigger and will never run.`);
      }
    }
  }

  // 8. Two steps on different branches of the same Parallel Split must not store their result
  //    under the same name.
  //
  //    The engine keeps ONE flat set of variables for the whole run — there is no per-branch
  //    scope — so both steps write the same key and the last branch to run wins. Nothing fails:
  //    the run completes, and a later step reads one branch's answer believing it has them all.
  //    That is the worst kind of bug to ship, because the green tick is the evidence people trust.
  //
  //    Defaults make it easy to hit by accident: three AI Agent steps all arrive as "agent",
  //    two Read Record steps both as "record". The author never typed a name, so there is
  //    nothing on screen to suggest a clash.
  for (const split of nodes.filter((n) => n.type === 'control.parallelSplit')) {
    // variable name -> the labels of the steps writing it, one entry per branch
    const writers = new Map<string, string[]>();

    for (const first of edges.filter((e) => e.from === split.id)) {
      // Walk this one branch, stopping where the branches come back together. Keyed by name, so a
      // name repeated WITHIN a branch collapses to one entry — that is ordinary sequential
      // overwriting, visible in the step order, and not a clash.
      const onThisBranch = new Map<string, string>();
      const seen = new Set<string>();
      const queue = [first.to];
      while (queue.length) {
        const id = queue.shift() as string;
        if (seen.has(id)) continue;
        seen.add(id);
        const node = byId.get(id);
        if (!node) continue;
        if (node.type === 'control.parallelJoin') continue; // the branch ends here

        const typed = node.config?.as;
        const name = !asActive(node)
          ? undefined
          : typeof typed === 'string' && typed.trim()
            ? typed.trim()
            : node.type
              ? asDefaults?.[node.type]
              : undefined;
        if (name) onThisBranch.set(name, nameOf(node));

        for (const next of edges.filter((e) => e.from === id)) queue.push(next.to);
      }

      for (const [name, label] of onThisBranch) {
        writers.set(name, [...(writers.get(name) ?? []), label]);
      }
    }

    for (const [name, labels] of writers) {
      if (labels.length > 1) {
        errors.push(
          `Steps ${labels.map((l) => `"${l}"`).join(' and ')} run on parallel branches and all ` +
            `store their result as "${name}", so only the last one to finish survives. ` +
            `Give each one its own "store result as" name.`,
        );
      }
    }
  }

  // 8b. Paths that run at the same time may come back together only at a Parallel Join. Any
  //    other step they both reach runs once per path — twice where the designer meant once.
  //    Paths that never run together stay allowed: two exits of one Decision meeting at a shared
  //    step, or a loop's last step drawing back to its For Each / While.
  //    Paths run together after a Parallel Split, or after any step with several lines on the SAME
  //    exit (fan-out). An Inclusive Gateway is left out: no join waits for just the paths it fired,
  //    so meeting at a plain step is its documented pattern.
  {
    type Line = (typeof adoptedEdges)[number];
    const lines = adoptedEdges.filter((e) => byId.has(e.from) && byId.has(e.to));
    const exitOf = (e: Line): string => String(e.condition ?? '').trim();
    const walk = (start: string, skip: Set<string>, ahead: boolean): Set<string> => {
      const seen = new Set<string>([start]);
      const queue = [start];
      while (queue.length) {
        const id = queue.shift() as string;
        for (const e of lines) {
          const next = ahead ? (e.from === id ? e.to : undefined) : e.to === id ? e.from : undefined;
          if (next !== undefined && !seen.has(next) && !skip.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      return seen;
    };
    // The steps a token passes between leaving on line "from" and arriving on line "into";
    // null when it cannot get there without going through the merge step or the fork again.
    const between = (from: Line, into: Line, skip: Set<string>): Set<string> | null => {
      if (from === into) return new Set<string>();
      if (skip.has(from.to)) return null;
      const ahead = walk(from.to, skip, true);
      if (!ahead.has(into.from)) return null;
      const back = walk(into.from, skip, false);
      return new Set([...ahead].filter((id) => back.has(id)));
    };
    const together: Array<[Line, Line, string]> = [];
    for (const fork of nodes) {
      if (fork.type === 'control.inclusiveGateway') continue;
      const out = lines.filter((e) => e.from === fork.id);
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          if (fork.type === 'control.parallelSplit' || exitOf(out[i]) === exitOf(out[j])) together.push([out[i], out[j], fork.id]);
        }
      }
    }
    for (const step of nodes) {
      if (step.type === 'control.parallelJoin') continue; // waiting for every path is its job
      const incoming = lines.filter((e) => e.to === step.id);
      if (incoming.length < 2) continue;
      let forkId: string | undefined;
      for (const [o1, o2, fid] of together) {
        const skip = new Set<string>([step.id, fid]);
        for (const a of incoming) {
          for (const b of incoming) {
            if (a === b || forkId) continue;
            const p1 = between(o1, a, skip);
            const p2 = p1 && between(o2, b, skip);
            // Shared steps on the way mean the paths met earlier — that step is the one reported.
            if (p1 && p2 && ![...p1].some((id) => p2.has(id))) forkId = fid;
          }
        }
        if (forkId) break;
      }
      if (forkId) {
        const fork = byId.get(forkId);
        errors.push(
          'Step ' + '"' + nameOf(step) + '"' + ' is reached by paths that run at the same time (they split at ' +
            (fork ? '"' + nameOf(fork) + '"' : 'an earlier step') + '), so it would run once for each path. ' +
            'Bring them together with a Parallel Join first, or connect only one of them.',
        );
      }
    }
  }

  // 9. Required config must be present. A descriptor default is display-only — the engine
  //    receives what was SAVED — so a Wait with no amount waits 0 ms and a task with no
  //    assignee goes to nobody. A {{template}} counts: it resolves at run time.
  //    And an entity-typed field must name a model this app has, or the step never finds a row.
  if (entries.size > 0) {
    for (const node of nodes) {
      const entry = node.type ? entries.get(node.type) : undefined;
      if (!entry) continue;
      const config = node.config ?? {};
      for (const f of entry.config ?? []) {
        if (!f) continue;
        const value = config[f.key];
        if (f.required && isConfigValueMissing(value)) {
          errors.push(`Node "${nameOf(node)}" is missing its required "${f.key}" setting.`);
          continue;
        }
        if (f.type === 'entity' && entityNames && entityNames.size > 0 && typeof value === 'string' && value.trim()) {
          if (!/\{\{.*\}\}/.test(value) && !entityNames.has(value.trim())) {
            errors.push(`Node "${nameOf(node)}" refers to entity "${value.trim()}", which this app does not have.`);
          }
        }
      }
    }
  }

  return errors;
}
