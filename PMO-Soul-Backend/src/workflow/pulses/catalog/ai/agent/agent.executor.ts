import { AgentStepError, type PulseExecutor } from '../../../core';

/**
 * Runs a configured agent through the injected `agent` service port.
 *
 * Every foreseeable failure comes back as a CATCHABLE business error rather than a thrown one,
 * so a designer can route it on the canvas — "if the agent could not answer, assign it to a
 * human" is the whole point of putting an agent in a workflow instead of behind a button.
 *
 * The error NAMES are the contract. They are what a designer types into an error branch, so
 * they are listed in agent.doc.md and must not be renamed casually:
 *
 *   AgentUnavailable    — this app has no agent runtime (generated before agents existed)
 *   AgentNotConfigured  — no AI provider key is set for the app
 *   AgentNotFound       — no agent with that id or name
 *   AgentHasNoTools     — the agent is allowed no tools, so it can read nothing
 *   NoActingUser        — nobody to run as: set "Run as" on the step
 *   AgentOutputInvalid  — the answer did not match the agent's output schema
 *   AgentBudgetExhausted — this RUN has spent its shared AI allowance (plan 3.9). Note the scope:
 *                         it is not about this step, so retrying it cannot help. The useful branch
 *                         is one that hands the work to a person.
 *   MissingAgent / MissingTask — the step itself is not filled in
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.agent) {
    return {
      error: {
        name: 'AgentUnavailable',
        message: 'This app has no agent runtime configured.',
      },
    };
  }

  const agentId = String(inputs.agentId ?? '').trim();
  if (!agentId) {
    return { error: { name: 'MissingAgent', message: 'AI Agent requires an agent to be chosen.' } };
  }

  const task = String(inputs.task ?? '').trim();
  if (!task) {
    return { error: { name: 'MissingTask', message: 'AI Agent requires a task to perform.' } };
  }

  const runAs = String(inputs.runAs ?? '').trim();
  const maxIterations = Number(inputs.maxIterations);
  const webSearchOff = String(inputs.webSearch ?? 'inherit').trim() === 'off';
  const as = String(inputs.as ?? 'agent').trim() || 'agent';
  const outputSchema = stepOutputSchema(inputs.outputSchema);

  try {
    const result = await ctx.services.agent({
      agentId,
      task,
      runAs: runAs || undefined,
      maxIterations: Number.isFinite(maxIterations) && maxIterations > 0 ? maxIterations : undefined,
      webSearch: webSearchOff ? false : undefined,
      outputSchema,
    });
    return {
      outputs: {
        [as]: {
          answer: result.answer,
          result: result.result,
          toolsUsed: result.toolsUsed,
        },
        // What this call cost, on the step output, so a run total can be summed without a
        // second table: `summarizeAgentUsage` (core) and the Runs page both read it here.
        ...(result.usage
          ? {
              usage: {
                calls: result.usage.calls ?? 1,
                inputTokens: result.usage.inputTokens ?? 0,
                outputTokens: result.usage.outputTokens ?? 0,
              },
            }
          : {}),
      },
    };
  } catch (err) {
    // Only the service's own, deliberate refusals become branches. A provider timeout or a
    // database fault is a genuine fault and is rethrown, so the wrapper's retry and onError
    // policy handle it — turning those into a business branch would make a transient outage
    // look like a considered decision by the agent.
    if (err instanceof AgentStepError) {
      return { error: { name: err.code, message: err.message } };
    }
    throw err;
  }
};

/**
 * The step's own output schema, when one is set. A `json` field arrives as an object from the
 * designer, or as text when typed by hand; anything that is not a JSON object is ignored, so a
 * blank box means "use the agent row's schema", never "no schema".
 */
export function stepOutputSchema(raw: unknown): Record<string, unknown> | undefined {
  let value = raw;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return undefined;
    try {
      value = JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
