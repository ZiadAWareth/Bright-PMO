/**
 * The one error the agent service throws, carrying a name the designer can catch on.
 *
 * Modelled on `BlockedUrlError` in url-guard.ts, and for the same reason: the SERVICE knows why
 * it could not run (no provider, no such agent, nobody to act as), the EXECUTOR knows how a
 * workflow wants to hear about it. Throwing a typed error lets the executor turn every one of
 * these into a catchable business error — an `onError` branch on the canvas — instead of a
 * technical failure that kills the run with a stack trace.
 *
 * `code` is a stable, documented string. It appears verbatim as the error name a designer types
 * into an error-handling branch, so renaming one silently breaks a customer's workflow.
 */
export class AgentStepError extends Error {
  readonly name = 'AgentStepError';

  constructor(
    readonly code:
      | 'AgentUnavailable'
      | 'AgentNotConfigured'
      | 'AgentNotFound'
      | 'AgentHasNoTools'
      | 'NoActingUser'
      | 'AgentOutputInvalid'
      // The run's shared AI budget is spent (plan 3.9). A catchable branch rather than a pause:
      // nothing resumes a paused run today, and a resumed one would find the budget still empty and
      // pause again. "Hand it to a human" is an edge a designer can draw; a livelock is not.
      | 'AgentBudgetExhausted'
      // The agent is allowed to search the web but the configured provider has no native search.
      // Refused before anything is spent: an agent that "searched" and did not is worse than one
      // that says it cannot.
      | 'WebSearchUnavailable',
    message: string,
  ) {
    super(message);
  }
}
