import { buildAgentTools } from './agent.tools';
import type { GroundingService } from './grounding/grounding.service';
import type { ResolvedAiConfig } from './ai-config';
import type { AgentRunOptions } from './agent.runtime';
import {
  loadNamedAgent,
  prepareNamedAgentInputs,
  type NamedAgentRow,
  type ActingPrincipal,
} from './named-agent.rules';

export { loadNamedAgent };
export type { NamedAgentRow, ActingPrincipal };

/**
 * The service half of "run a named agent": narrow the tool list and the grounding pack to the
 * agent's ceilings, then hand everything to the pure preparation in named-agent.rules.ts.
 *
 * The ceiling is applied to BOTH halves: the pack decides what the agent can name, the tool list
 * decides what it can call. Both the workflow step and the ask route call this, so a page and a
 * workflow can never disagree about what an agent may do.
 */
export async function prepareNamedAgent(deps: {
  prisma: any;
  grounding: GroundingService;
  cfg: ResolvedAiConfig;
  agent: NamedAgentRow;
  principal: ActingPrincipal;
  task: string;
  organizationId?: AgentRunOptions['context']['organizationId'];
  maxIterations?: number;
  webSearch?: boolean;
  outputSchema?: unknown;
}) {
  const tools = buildAgentTools({
    prisma: deps.prisma,
    redaction: deps.grounding.getRedactionPolicy(),
    allowedTools: deps.agent.allowedTools,
  });
  const grounding = await deps.grounding.getPack({
    permissions: deps.principal.permissions,
    isPlatformAdmin: !!deps.principal.isPlatformAdmin,
    allowedEntities: deps.agent.allowedEntities,
  });
  return prepareNamedAgentInputs({ ...deps, tools, grounding });
}
