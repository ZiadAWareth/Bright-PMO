import type { PulseWorkflowDefinition, PulseNode, PulseEdge } from './pulses/core/graph';
import type { PulseMeta, PulseFieldDescriptor } from './pulses/core/pulse.contract';
import { branchesFor, declaredBranches, acceptsErrorEdge, adoptSoleBranch } from './pulses/core/branches';
import { RETIRED_PULSES } from './pulses/core/retired';

export { branchesFor, declaredBranches, acceptsErrorEdge, adoptSoleBranch };

/** The registry's execute-free view of a pulse — what buildPulseRegistry().all() yields. */
export interface ManifestEntry {
  meta: PulseMeta;
  config?: PulseFieldDescriptor[];
}

export interface GraphCatalog {
  pulses: ManifestEntry[];
  /** Entity names this app has. Omit to skip the entity check (no schema at hand). */
  entities?: string[];
}

const ERROR_LABEL = 'error';
const SPLIT_TYPE = 'control.parallelSplit';
const JOIN_TYPE = 'control.parallelJoin';

const name = (n: PulseNode): string => '"' + (n.label || n.id) + '"';

/** '', null, undefined, whitespace and [] are missing; a {{template}} is a value. */
export function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const isTemplate = (value: unknown): boolean => typeof value === 'string' && /\{\{.*\}\}/.test(value);

/**
 * Every problem that stops this definition from running. Empty means it may go live.
 *
 * Messages are written for the designer, and each names the node, because the failure this
 * prevents used to surface at run time, far from the edit that caused it.
 */
export function validateDefinition(
  definition: PulseWorkflowDefinition | null | undefined,
  catalog: GraphCatalog,
): string[] {
  const errors: string[] = [];
  const nodes: PulseNode[] = definition?.nodes ?? [];
  const edges: PulseEdge[] = definition?.edges ?? [];
  if (nodes.length === 0) return ['Workflow has no nodes.'];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byType = new Map((catalog.pulses ?? []).map((p) => [p.meta.type, p]));
  const pulseOf = (n: PulseNode): ManifestEntry | undefined => (n.type ? byType.get(n.type) : undefined);
  const isTrigger = (n: PulseNode): boolean => n.kind === 'trigger' || pulseOf(n)?.meta.category === 'trigger';
  // Branch coverage is checked on the ADOPTED view: a lone unlabelled edge out of a node with one
  // outstanding outcome is that outcome (the engine runs it that way; the designer labels it on load).
  const metaFor = (type: string) => byType.get(type)?.meta;
  const adopted = adoptSoleBranch(nodes as any, edges as any, metaFor) as PulseEdge[];
  const outOf = (id: string): PulseEdge[] => adopted.filter((e) => e.from === id);

  // 1. Exactly one trigger — none never fires, several is an ambiguous entry point.
  const triggers = nodes.filter(isTrigger);
  if (triggers.length === 0) errors.push('Workflow must have a trigger node.');
  if (triggers.length > 1) errors.push('Workflow must have exactly one trigger node.');

  // 2. Every edge must join two nodes that exist — a dangling edge breaks the walk mid-run.
  for (const edge of edges) {
    if (!byId.has(edge.from)) errors.push('An edge starts from a node that no longer exists ("' + edge.from + '").');
    if (!byId.has(edge.to)) errors.push('An edge points at a node that no longer exists ("' + edge.to + '").');
  }

  // 2b. An End step (or Terminate All) finishes the run: a step connected after it could never run.
  const ENDS = new Set(['control.endSuccess', 'control.endError', 'control.terminate']);
  for (const edge of edges) {
    const from = byId.get(edge.from);
    if (from && ENDS.has(String(from.type))) {
      errors.push('Node ' + name(from) + ' ends the workflow, so nothing can follow it. Remove the connection after it.');
    }
  }
  // 2c. Throw Error always fails: only its error path is ever taken, so a plain line after it is dead.
  for (const edge of edges) {
    const from = byId.get(edge.from);
    if (from && from.type === 'control.throwError' && String(edge.condition ?? '').trim() !== ERROR_LABEL) {
      errors.push('Node ' + name(from) + ' always fails, so a plain line after it never runs. Connect its error path instead, or remove the line.');
    }
  }

  // 3. Every node type must be one the engine has a pulse for.
  for (const node of nodes) {
    if (node.kind === 'trigger' && !node.type) continue; // a bare start marker is allowed
    if (!node.type) {
      errors.push('Node ' + name(node) + ' has no component type, so the engine cannot run it.');
    } else if (RETIRED_PULSES[node.type]) {
      // A step removed from the catalogue: say so, and what to use instead.
      const r = RETIRED_PULSES[node.type];
      errors.push('Node ' + name(node) + ' can no longer run: the "' + r.label + '" step was removed. ' + r.instead);
    } else if (!byType.has(node.type)) {
      errors.push('Node ' + name(node) + ' uses "' + node.type + '", which this app has no component for.');
    }
  }

  for (const node of nodes) {
    const pulse = pulseOf(node);
    if (!pulse) continue;
    const config = node.config ?? {};

    // 4. Required config — the descriptor's default is display-only, so an empty required field
    //    reaches the executor empty.
    for (const field of pulse.config ?? []) {
      if (field.required && isMissing(config[field.key])) {
        errors.push('Node ' + name(node) + ' is missing its required "' + field.label + '" setting.');
      }
      // 8. An entity field must name an entity this app has.
      if (field.type === 'entity' && catalog.entities && !isMissing(config[field.key]) && !isTemplate(config[field.key])) {
        const wanted = String(config[field.key]).trim();
        if (!catalog.entities.includes(wanted)) {
          errors.push('Node ' + name(node) + ' refers to entity "' + wanted + '", which this app does not have.');
        }
      }
    }

    // 5. Branch coverage — every outcome the node can route on needs an edge with exactly that
    //    label, or the run silently dead-ends (or, worse, follows every unlabeled edge).
    if (isTrigger(node)) continue;
    const out = outOf(node.id);
    const labelled = new Set(out.map((e) => (e.condition ?? '').trim()).filter(Boolean));
    for (const branch of branchesFor(pulse.meta, config)) {
      if (!labelled.has(branch)) errors.push('Node ' + name(node) + ' has no "' + branch + '" branch.');
    }
    const known = new Set(declaredBranches(pulse.meta, config));
    for (const label of labelled) {
      if (label === ERROR_LABEL) {
        if (!acceptsErrorEdge(pulse.meta)) errors.push('Node ' + name(node) + ' cannot have an "error" branch — nothing leaves it.');
        continue;
      }
      if (!known.has(label)) {
        errors.push('Node ' + name(node) + ' has a "' + label + '" branch, but it never routes to a branch by that name.');
      }
    }
  }

  // 6. Cycles — allowed only through a loop node (forEach / while), which is the one node that
  //    knows how to stop. With loop nodes removed, any cycle left is one that never ends.
  const loopIds = new Set(nodes.filter((n) => !!pulseOf(n)?.meta.loop).map((n) => n.id));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (loopIds.has(id)) return false;
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    for (const edge of outOf(id)) if (hasCycle(edge.to)) return true;
    visiting.delete(id);
    done.add(id);
    return false;
  };
  if (nodes.some((n) => hasCycle(n.id))) errors.push('Workflow contains a loop that never ends.');

  // 7. Every node must be reachable from the trigger, or it is dead configuration.
  if (triggers.length === 1) {
    const reachable = new Set<string>([triggers[0].id]);
    const queue = [triggers[0].id];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const edge of outOf(current)) {
        if (!reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) errors.push('Node ' + name(node) + ' is not connected to the trigger and will never run.');
    }
  }

  // 9. Two steps on different branches of one Parallel Split must not store their result under
  //    the same name: variables are one flat bag, so the last branch to finish silently wins.
  //    Defaults are the dangerous case — three untouched steps all arrive as "agent".
  const asDefault = (n: PulseNode): string | undefined => {
    const f = (pulseOf(n)?.config ?? []).find((d) => d.key === 'as');
    return typeof f?.default === 'string' && f.default.trim() ? f.default.trim() : undefined;
  };
  // A "store result as" that belongs to another mode (showWhen) stores nothing: a Wait counting
  // time writes no watchedRecord, however its hidden field reads.
  const asActive = (n: PulseNode): boolean => {
    const cfg = pulseOf(n)?.config ?? [];
    const f = cfg.find((d) => d.key === 'as') as (typeof cfg)[number] & { showWhen?: { key: string; is: string[] } } | undefined;
    if (!f?.showWhen) return true;
    const ctl = cfg.find((d) => d.key === f.showWhen!.key);
    return f.showWhen.is.includes(String(n.config?.[f.showWhen.key] ?? ctl?.default ?? ''));
  };
  for (const split of nodes.filter((n) => n.type === SPLIT_TYPE)) {
    const writers = new Map<string, string[]>();
    for (const first of outOf(split.id)) {
      const onThisBranch = new Map<string, string>();
      const seen = new Set<string>();
      const queue = [first.to];
      while (queue.length) {
        const id = queue.shift() as string;
        if (seen.has(id)) continue;
        seen.add(id);
        const node = byId.get(id);
        if (!node) continue;
        if (node.type === JOIN_TYPE) continue; // the branch ends here
        const typed = node.config?.as;
        const stored = !asActive(node) ? undefined : typeof typed === 'string' && typed.trim() ? typed.trim() : asDefault(node);
        if (stored) onThisBranch.set(stored, node.label || node.id);
        for (const next of outOf(id)) queue.push(next.to);
      }
      for (const [stored, label] of onThisBranch) writers.set(stored, [...(writers.get(stored) ?? []), label]);
    }
    for (const [stored, labels] of writers) {
      if (labels.length > 1) {
        errors.push(
          'Steps ' + labels.map((l) => '"' + l + '"').join(' and ') + ' run on parallel branches and all ' +
            'store their result as "' + stored + '", so only the last one to finish survives. ' +
            'Give each one its own "store result as" name.',
        );
      }
    }
  }

  // 10. Paths that run at the same time may come back together only at a Parallel Join. Any
  //    other step they both reach runs once per path — twice where the designer meant once.
  //    Paths that never run together stay allowed: two exits of one Decision meeting at a shared
  //    step, or a loop's last step drawing back to its For Each / While.
  //    Paths run together after a Parallel Split, or after any step with several lines on the SAME
  //    exit (fan-out). An Inclusive Gateway is left out: no join waits for just the paths it fired,
  //    so meeting at a plain step is its documented pattern.
  {
    type Line = (typeof adopted)[number];
    const lines = adopted.filter((e) => byId.has(e.from) && byId.has(e.to));
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
          'Step ' + name(step) + ' is reached by paths that run at the same time (they split at ' +
            (fork ? name(fork) : 'an earlier step') + '), so it would run once for each path. ' +
            'Bring them together with a Parallel Join first, or connect only one of them.',
        );
      }
    }
  }

  return errors;
}
