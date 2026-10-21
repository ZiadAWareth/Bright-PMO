import { AgentStepError } from '../workflow/pulses/core/agent-error';
import { webSearchSupport } from './web-search.rules';
import type { ResolvedAiConfig } from './ai-config';
import type { AgentRunOptions } from './agent.runtime';

/** The context runAgent() expects, so this module cannot disagree with it. */
type RunContext = AgentRunOptions['context'];

/**
 * Absolute cap on model round-trips for one agent call, whatever the configuration says.
 *
 * Read-only agents cannot corrupt data, so cost is the only remaining way one can do harm — and
 * the way it happens is an agent inside a loop, not one expensive question. This is the floor
 * under every other limit: it bounds how deeply ONE call may think.
 */
export const AGENT_MAX_ITERATIONS = 8;

/** The SMALLER of every cap wins: a caller's own cap can never talk the configured one upwards. */
export function iterationCap(...caps: Array<number | null | undefined>): number {
  const valid = [...caps, AGENT_MAX_ITERATIONS].filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0,
  );
  return Math.min(...valid);
}

/**
 * Append the output contract to the question only when the agent HAS one. An agent without a
 * schema answers in prose; asking every agent for JSON would make the one used for chat unusable.
 */
export function withOutputInstruction(task: string, outputSchema: unknown): string {
  if (!outputSchema) return task;
  return (
    `${task}\n\n` +
    `Reply with ONLY a JSON object matching this schema, and no other text:\n` +
    `${JSON.stringify(outputSchema)}`
  );
}

/**
 * Parse the answer back into a value a gateway can branch on, or a page can render.
 *
 * Checks the REQUIRED keys are present and nothing more. Full JSON-Schema validation is a library
 * and a much larger promise; the failure that actually bites is a gateway reading
 * `{{result.decision}}`, finding undefined, and quietly taking the else branch — a wrong path
 * taken silently, which is worse than a step that fails and says why.
 */
export function parseAgentOutput(answer: string, outputSchema: any, agentName: string): unknown {
  if (!outputSchema) return undefined;
  // Models fence JSON in \`\`\`json blocks however firmly they are told not to.
  const fenced = answer.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced ? fenced[1] : answer).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AgentStepError(
      'AgentOutputInvalid',
      `Agent "${agentName}" was asked for JSON but answered with prose: ${answer.slice(0, 200)}`,
    );
  }
  const required: string[] = Array.isArray(outputSchema?.required) ? outputSchema.required : [];
  const missing = required.filter(
    (key) => !parsed || typeof parsed !== 'object' || !(key in (parsed as object)),
  );
  if (missing.length) {
    throw new AgentStepError(
      'AgentOutputInvalid',
      `Agent "${agentName}" left out required field(s): ${missing.join(', ')}.`,
    );
  }
  return parsed;
}

/**
 * What an app may say about an agent to someone who did not build it.
 *
 * The instructions are the administrator's — they can name internal rules, thresholds, people.
 * The ceilings are an internal matter too. A consumer choosing an agent for a page needs its
 * identity and its job, nothing else. This is the shape the App Contract publishes.
 */
export interface PublicAgent {
  id: string;
  name: string;
  role: string | null;
}
export function publicAgentSummary(row: { id: string; name: string; role?: string | null }): PublicAgent {
  return { id: String(row.id), name: String(row.name), role: row.role ?? null };
}

/** A row from the Agents page, as the runtime needs it. */
export interface NamedAgentRow {
  id: string;
  name: string;
  role?: string | null;
  instructions: string;
  allowedEntities: string[] | null;
  allowedTools: string[] | null;
  modelOverride?: string | null;
  maxIterations?: number | null;
  outputSchema?: unknown;
  /** May search the web with the provider's own tool. Off unless the administrator turned it on. */
  webSearch?: boolean | null;
}

/** Whose permissions the agent works under. Never the agent's own — that list is a ceiling. */
export interface ActingPrincipal {
  /** The app's own user id — numeric, as the User table defines it. */
  id: number;
  email?: string;
  permissions: Record<string, any>;
  isPlatformAdmin?: boolean;
}

/**
 * Load the agent a caller named. Failures are the same AgentStepError codes the workflow step
 * raises, so a designer and a page see the same reasons for the same problems.
 */
export async function loadNamedAgent(
  prisma: any,
  ref: { agentId?: string; agentName?: string },
): Promise<NamedAgentRow> {
  const agents = prisma?.agent;
  if (!agents?.findFirst) {
    throw new AgentStepError(
      'AgentUnavailable',
      'This app was generated before agents existed. Redeploy it to use agents.',
    );
  }
  const agent = ref.agentId
    ? await agents.findFirst({ where: { id: ref.agentId } })
    : ref.agentName
      ? await agents.findFirst({ where: { name: ref.agentName } })
      : null;
  if (!agent) {
    throw new AgentStepError(
      'AgentNotFound',
      `No agent named "${ref.agentName ?? ref.agentId ?? '(none selected)'}". ` +
        `Pick one, or create it on the Agents page.`,
    );
  }
  return agent as NamedAgentRow;
}

/**
 * Everything runAgent() needs to run THIS agent for THIS person, from inputs the caller already
 * built: the tool list (already narrowed to the agent's ceiling) and the grounding pack (already
 * narrowed to it). Pure, so it is testable by calling — the narrowing itself happens in
 * named-agent.ts, which knows Prisma and the grounding service.
 *
 * `allowedTools: []` means no tools at all — deliberate in the schema, and refused here, because
 * an agent with no tools cannot read anything and answers confidently from nothing, which is the
 * one failure mode grounding exists to prevent.
 */
export function prepareNamedAgentInputs<TTool extends { name: string }, TPack>(deps: {
  cfg: ResolvedAiConfig;
  agent: NamedAgentRow;
  principal: ActingPrincipal;
  task: string;
  tools: TTool[];
  grounding: TPack;
  organizationId?: RunContext['organizationId'];
  maxIterations?: number;
  /** A step may turn search OFF for itself; it can never turn on what the row does not allow. */
  webSearch?: boolean;
  /** A workflow step's own answer shape; replaces the row's outputSchema for this call (Wave D). */
  outputSchema?: unknown;
}) {
  const { agent, principal } = deps;
  if (deps.tools.length === 0) {
    throw new AgentStepError(
      'AgentHasNoTools',
      `Agent "${agent.name}" is allowed no tools, so it can read nothing. Grant it at least ` +
        `one tool on the Agents page.`,
    );
  }
  const question = withOutputInstruction(deps.task, deps.outputSchema ?? agent.outputSchema);
  const webSearch = !!agent.webSearch && deps.webSearch !== false;
  if (webSearch && !webSearchSupport(deps.cfg)) {
    throw new AgentStepError(
      'WebSearchUnavailable',
      `Agent "${agent.name}" is allowed to search the web, but provider "${deps.cfg.provider}" has no ` +
        `native web search. Use Anthropic or OpenAI on the AI Provider page, or turn web search off for this agent.`,
    );
  }
  return {
    cfg: { ...deps.cfg, model: agent.modelOverride || deps.cfg.model } as ResolvedAiConfig,
    options: {
      question,
      systemPrompt: agent.instructions,
      tools: deps.tools,
      webSearch,
      maxIterations: iterationCap(deps.maxIterations, agent.maxIterations),
      context: {
        userId: principal.id,
        userEmail: principal.email,
        organizationId: deps.organizationId,
        isPlatformAdmin: !!principal.isPlatformAdmin,
        permissions: principal.permissions,
        grounding: deps.grounding,
      },
    },
    /** The facts every surface records about the run, before it starts. */
    who: {
      question,
      userId: principal.id,
      userEmail: principal.email,
      provider: deps.cfg.provider,
      // Per-agent override recorded now, not re-derived later: AgentSetting is one mutable row.
      modelName: agent.modelOverride || deps.cfg.model,
      agentId: agent.id,
      // A COPY of the agent as it stood now. Widening its ceiling tomorrow must not rewrite what
      // this run's audit says it was permitted to read.
      definitionSnapshot: agent,
    },
  };
}
