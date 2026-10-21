import type { PulseWorkflowDefinition, PulseNode } from './pulses/core/graph';

export const AGENT_TYPE = 'ai.agent';
export const USER_TASK_TYPE = 'human.userTask';
/** Nodes that choose a path from an expression. */
export const DECISION_TYPES = new Set([
  'control.exclusiveGateway',
  'control.inclusiveGateway',
  'control.switch',
  'control.evaluate',
]);

export interface ConsentProblem {
  agentNodeId: string;
  decisionNodeId: string;
  message: string;
}

/** Every string inside a node's config, so a reference is found wherever the designer put it. */
function configText(node: PulseNode): string {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(node.config ?? {});
  return out.join('\n');
}

/** Does this node's config read the variable an agent step stored its answer in? */
export function readsVariable(node: PulseNode, variable: string): boolean {
  const text = configText(node);
  // {{agent}}, {{agent.result.x}}, {{ agent.answer }} — the templating the engine resolves.
  const re = new RegExp('\\{\\{\\s*' + variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[.\\s}\\]])');
  return re.test(text);
}

/**
 * Problems that must be fixed before the workflow may run. Empty means the graph is consented.
 *
 * From each agent step the walk follows every edge. Reaching a User Task ends that path: a
 * person has seen the answer. Reaching a decision node that reads the agent's variable before
 * any User Task is the problem. A step marked `allowAutoDecision` is skipped — a deliberate,
 * visible exception rather than a hidden one.
 */
export function lintConsent(definition: PulseWorkflowDefinition | null | undefined): ConsentProblem[] {
  const nodes = definition?.nodes ?? [];
  const edges = definition?.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const problems: ConsentProblem[] = [];

  for (const agent of nodes) {
    if (agent.type !== AGENT_TYPE) continue;
    if (agent.config?.allowAutoDecision === true) continue;
    const variable = String(agent.config?.as ?? 'agent').trim() || 'agent';

    const seen = new Set<string>([agent.id]);
    const queue = edges.filter((e) => e.from === agent.id).map((e) => e.to);
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = byId.get(id);
      if (!node) continue;
      if (node.type === USER_TASK_TYPE) continue; // consent obtained on this path
      if (DECISION_TYPES.has(node.type) && readsVariable(node, variable)) {
        const name = (n: PulseNode) => n.label ? `"${n.label}"` : n.id;
        problems.push({
          agentNodeId: agent.id,
          decisionNodeId: node.id,
          message:
            `AI Agent step ${name(agent)} feeds ${name(node)} with no User Task in between, so the ` +
            `agent's answer would decide the path on its own. Add a User Task before it so a person ` +
            `confirms the answer, or set "Allow automatic decision" on the agent step to make the ` +
            `exception explicit.`,
        });
        continue; // reported once per decision node; the walk beyond it is that node's business
      }
      for (const e of edges) if (e.from === id) queue.push(e.to);
    }
  }
  return problems;
}
