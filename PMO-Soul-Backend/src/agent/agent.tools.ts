import { PulseRepository } from '../workflow/pulses/core';
import { RedactionPolicy } from './grounding';
import { AgentTool } from './tool.contract';
import { narrowTools, ScopeCeiling } from './agent-scope';
import { describeTool } from './tools/describe.tool';
import { createQueryTool } from './tools/query.tool';
import { createMetricsTool } from './tools/metrics.tool';
import { createHistoryTool } from './tools/history.tool';

/** `BusinessUnit` -> `businessUnit`, the name Prisma gives the delegate. */
function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * A read-only `PulseRepository` over the app's Prisma client.
 *
 * The write methods throw rather than being omitted, because `PulseRepository` requires them.
 * Throwing is the honest implementation: the agent has no write tools today, and if one is
 * added later it should have to change this file deliberately rather than discover that
 * mutation already worked.
 */
export function prismaRepoFactory(prisma: any): (entity: string) => PulseRepository {
  return (entity: string): PulseRepository => {
    const delegate = () => {
      const d = prisma[delegateName(entity)];
      // The query tool resolves entity names against the grounding pack before calling, so a
      // miss here means the grounding and the Prisma client disagree — worth a loud message
      // rather than "cannot read property findMany of undefined".
      if (!d) throw new Error(`Unknown entity "${entity}".`);
      return d;
    };
    const readOnly = (op: string) => (): never => {
      throw new Error(`The assistant cannot ${op} records.`);
    };
    return {
      findMany: (args) => delegate().findMany(args),
      count: (args) => delegate().count(args),
      groupBy: (args) => delegate().groupBy(args),
      aggregate: (args) => delegate().aggregate(args),
      findUnique: (where) => delegate().findFirst({ where }),
      create: readOnly('create'),
      update: readOnly('update'),
      delete: readOnly('delete'),
    };
  };
}

/**
 * The tools every server-side surface offers.
 *
 * Ordering matters a little: `describe_app` is listed first because a model reading the list
 * top-down is more likely to orient itself before querying, which is the behaviour we want.
 *
 * `allowedTools` is a configured agent's ceiling (plan 3.2) and is omitted by the assistant page.
 * It narrows this list and can never extend it — naming a tool that is not built here does not
 * bring it into existence.
 */
export function buildAgentTools(deps: {
  prisma: any;
  redaction: RedactionPolicy;
  allowedTools?: ScopeCeiling;
}): AgentTool[] {
  const repo = prismaRepoFactory(deps.prisma);
  return narrowTools(
    [
      describeTool,
      createQueryTool({ repo, redaction: deps.redaction }),
      // Last, and that is fine: a model reaches for it when the question says "trend" or
      // "compared to", and its own description is what tells it not to do the sums by hand.
      createMetricsTool({ repo, redaction: deps.redaction }),
      // Takes no redaction policy, and that is not an omission: it returns no field values at all,
      // so there is nothing for the policy to act on. See the note at the top of history.tool.ts.
      createHistoryTool({ repo }),
    ],
    withDescribe(deps.allowedTools),
  );
}

/**
 * describe_app comes with any other tool. It reads only table and field names — already limited to
 * the agent's tables and its person's permissions — and every other tool needs those names. An
 * agent granted query_data without it guessed ("Role" for RolesAndPermissions), and the prompt's
 * mention of it made some models call it anyway, which providers like Groq refuse as a whole request.
 */
function withDescribe(ceiling: ScopeCeiling | undefined): ScopeCeiling | undefined {
  if (!Array.isArray(ceiling) || ceiling.length === 0 || ceiling.includes('describe_app')) return ceiling;
  return ['describe_app', ...ceiling];
}

/**
 * Every tool name an agent can be granted — what the Agents page offers, and what a write to
 * `allowedTools` is checked against.
 *
 * It is a written list rather than something derived from `buildAgentTools`, because deriving it
 * would mean constructing the tools (and therefore a Prisma client and a redaction policy) just to
 * read three strings. The cost of writing it down is that it can drift, so a generator test asserts
 * these names are exactly the ones `buildAgentTools` returns. Add a tool above, add it here.
 */
export const AGENT_TOOL_NAMES = ['describe_app', 'query_data', 'analyze_metric', 'read_run_history'] as const;
