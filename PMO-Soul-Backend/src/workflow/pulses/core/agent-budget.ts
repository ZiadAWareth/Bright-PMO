/**
 * One AI spend ceiling for a whole workflow run, shared by every agent call inside it (plan 3.9,
 * §10.4).
 *
 * Why a per-call cap is not enough. Every existing limit bounds ONE agent call: the runtime's
 * `MAX_ITERATIONS = 8`, the agent row's `maxIterations`, the step's own `maxIterations`. None of
 * them bounds how many CALLS a run makes. An `ai.agent` inside a `forEach` over 500 records is 500
 * calls at 8 round-trips each — 4,000 paid requests, from a graph that looks like two nodes. The
 * multiplication is the whole risk (§10.4); a per-call cap is the wrong place to fight it.
 *
 * Deliberately plain TypeScript — no Nest, no Prisma, no timers. It is unit-testable on its own
 * and survives the lift into `@soul/agent-runtime`.
 *
 * Two things this is NOT:
 *   - It is not a cost estimate. Cost needs a price-per-model table, and prices change, differ per
 *     provider, and are unknowable for a customer-supplied `baseUrl`. A stale table that
 *     under-reports reads as a guarantee, which is worse than not offering one. Tokens are the
 *     honest unit; the customer knows their own rate.
 *   - It is not a clock. Wall-clock is already bounded twice, by `callLlm`'s per-request
 *     `timeoutMs` and by the interpreter's `STEP_CAP`. A third timer would only fire on runs that
 *     are slow but correct.
 */

export interface AgentBudgetLimits {
  /** Agent calls (not model round-trips) allowed in one run. */
  maxCalls: number;
  /** Input + output tokens allowed in one run, summed across every call. */
  maxTokens: number;
}

export type AgentBudgetVerdict = { allowed: true } | { allowed: false; reason: string };

/**
 * Mutable, and shared BY REFERENCE across everything in one run — including sub-workflows, which
 * build their own service bag and would otherwise each start fresh (six budgets at the permitted
 * nesting depth of five).
 *
 * No locking, and none needed: the interpreter's walk is a strictly sequential
 * `while (queue.length)` over a shifted queue, awaiting each node. Parallel branches interleave,
 * they never truly overlap, so two `spend()` calls cannot race.
 */
export class RunAgentBudget {
  private calls = 0;
  private tokens = 0;

  constructor(private readonly limits: AgentBudgetLimits) {}

  /**
   * Asked BEFORE a call, and it answers rather than throws — same shape as `RateLimiter.take`,
   * because the caller is the one that knows how its host wants to refuse.
   *
   * The token test is necessarily retrospective: nobody can know what a call will cost until it
   * has been made. So a run can overshoot `maxTokens` by at most one call's worth. That is
   * inherent, and the alternative — refusing a call because it MIGHT be expensive — would refuse
   * cheap calls too.
   */
  check(): AgentBudgetVerdict {
    if (this.calls >= this.limits.maxCalls) {
      return {
        allowed: false,
        reason:
          `this run has already made ${this.calls} AI agent calls, its limit ` +
          `(AGENT_RUN_MAX_CALLS=${this.limits.maxCalls})`,
      };
    }
    if (this.tokens >= this.limits.maxTokens) {
      return {
        allowed: false,
        reason:
          `this run has already used ${this.tokens} AI tokens, its limit ` +
          `(AGENT_RUN_MAX_TOKENS=${this.limits.maxTokens})`,
      };
    }
    return { allowed: true };
  }

  /**
   * Counted at ADMISSION, before the call is made, and deliberately separate from `spend`.
   *
   * If the call were counted on its way back, a call that threw would be free — and an agent step
   * inside a loop that fails every time would loop without limit, which is the same runaway this
   * class exists to stop, only cheaper per iteration and therefore longer.
   */
  admit(): void {
    this.calls += 1;
  }

  /** Tokens actually reported by the provider. A call that threw reports none, and so is counted
   *  in `calls` but not in `tokens` — the call ceiling is what bounds that case. */
  spend(usage?: { inputTokens?: number; outputTokens?: number }): void {
    this.tokens += (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  }

  /** For the audit trail and the run log. */
  snapshot(): { calls: number; tokens: number; maxCalls: number; maxTokens: number } {
    return { calls: this.calls, tokens: this.tokens, ...this.limits };
  }
}

/** `typeof process` guarded to match `rate-limit.ts` — this must stay liftable to the browser. */
function envInt(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * A fresh budget for one run.
 *
 * The defaults are meant to be invisible to anyone who designed their workflow on purpose and
 * immediate for anyone who put an agent in a loop over a table. 25 calls is far more than any
 * hand-drawn flow and far fewer than a 500-row `forEach`.
 *
 * Tunable by environment variable, with a WORKING default — which is the difference between this
 * and the `WORKFLOW_AI_API_KEY` mistake that plan item 3.18 removed. That variable had no default,
 * so the feature was dead until an operator edited a file inside a container they had no shell on.
 * This one is only ever a dial: leave it alone and the budget still holds.
 */
export function createRunAgentBudget(): RunAgentBudget {
  return new RunAgentBudget({
    maxCalls: envInt('AGENT_RUN_MAX_CALLS', 25),
    maxTokens: envInt('AGENT_RUN_MAX_TOKENS', 200_000),
  });
}

/** The AI usage line a run reports: what the Test dialog and the run detail show. */
export interface RunAgentUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** Only present when a price table exists — none does yet, so it is never set today. */
  costUsd?: number;
}

/**
 * The run's AI spend, summed from the `usage` object each ai.agent step leaves on its output.
 * Pure, so the Test result can be checked by calling it. Steps without usage (every non-agent
 * step, and an agent step that failed before the call) contribute nothing; a run with no agent
 * call at all yields undefined, so the dialog shows no cost line rather than "0 calls".
 */
export function summarizeAgentUsage(
  steps: ReadonlyArray<{ output?: unknown }>,
): RunAgentUsage | undefined {
  let total: RunAgentUsage | undefined;
  for (const step of steps) {
    const u = (step?.output as { usage?: Partial<RunAgentUsage> } | null | undefined)?.usage;
    if (!u || typeof u !== 'object') continue;
    const calls = Number(u.calls);
    if (!Number.isFinite(calls) || calls <= 0) continue;
    total ??= { calls: 0, inputTokens: 0, outputTokens: 0 };
    total.calls += calls;
    total.inputTokens += Number(u.inputTokens) || 0;
    total.outputTokens += Number(u.outputTokens) || 0;
    if (typeof u.costUsd === 'number') total.costUsd = (total.costUsd ?? 0) + u.costUsd;
  }
  return total;
}
