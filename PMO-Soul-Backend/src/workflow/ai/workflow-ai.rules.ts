import type { PulseWorkflowDefinition } from '../pulses/core/graph';
import type { ManifestEntry } from '../graph-rules';
import { validateDefinition, adoptSoleBranch } from '../graph-rules';
import { roleReferences, normalizeRoleName } from '../assignee-rules';

export const AGENT_TYPE = 'ai.agent';

export interface AiValidationContext {
  pulses: ManifestEntry[];
  /** Exact model names this app has; omit to skip the entity check. */
  entities?: string[];
  /** Ids of the agents on the Agents page; omit to skip the agent check. */
  agentIds?: string[];
  /** Role names in this organisation (the ROLES block); omit to skip the role check. */
  roles?: string[];
}

/**
 * Every problem in an AI-drafted definition, in the words the designer shows. The same rules
 * as Save, plus "unknown agent" — an invented agentId is the one mistake only the assistant
 * makes, since the designer picks agents from a list.
 */
/**
 * A spec written as "3 -> 4" makes the model emit the task's only edge unlabelled. Label it the
 * way the designer and the engine already read it, so the panel does not warn about a graph that
 * runs — and so "apply" puts the labelled edge on the canvas.
 */
export function normalizeAiWorkflow(
  definition: PulseWorkflowDefinition | null | undefined,
  pulses: ManifestEntry[],
): PulseWorkflowDefinition | null | undefined {
  if (!definition || !Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) return definition;
  const byType = new Map(pulses.map((p) => [p.meta.type, p.meta]));
  return { ...definition, edges: adoptSoleBranch(definition.nodes as any, definition.edges as any, (t) => byType.get(t)) as any };
}

export function validateAiWorkflow(
  definition: PulseWorkflowDefinition | null | undefined,
  ctx: AiValidationContext,
): string[] {
  const issues = validateDefinition(definition, { pulses: ctx.pulses, entities: ctx.entities });
  if (ctx.agentIds) {
    const known = new Set(ctx.agentIds);
    for (const node of definition?.nodes ?? []) {
      if (node.type !== AGENT_TYPE) continue;
      const id = node.config?.agentId;
      const label = '"' + (node.label || node.id) + '"';
      if (typeof id !== 'string' || !id.trim()) continue; // graph-rules reports the missing required field
      if (!known.has(id.trim())) {
        issues.push('Node ' + label + ' uses unknown agent "' + id + '" — pick one from the Agents page.');
      }
    }
  }
  // A role the spec named but this organisation never defined ("role:Super Admin" on a tenant
  // whose only role is "Organisation Admin") — the draft would pass Save and park a task in
  // nobody's inbox. Same shape as the agent check; the designer sees it before Apply.
  if (ctx.roles) {
    const known = new Set(ctx.roles.map(normalizeRoleName));
    const list = ctx.roles.length ? ctx.roles.join(', ') : 'none';
    for (const ref of roleReferences(definition, ctx.pulses)) {
      if (!known.has(normalizeRoleName(ref.role))) {
        issues.push('Node ' + ref.label + ' uses unknown role "' + ref.role + '" — pick one of: ' + list + '.');
      }
    }
  }
  return issues;
}
