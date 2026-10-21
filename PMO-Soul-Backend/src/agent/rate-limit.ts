/**
 * One limit is never enough.
 *
 * A single per-hour cap lets the entire hour's budget be spent in ten seconds, which is the
 * runaway-loop case. A single per-minute cap allows sixty times that per hour, which is the
 * slow-drain case. Two windows together close both, and the code for two is the code for one.
 */
export interface RateLimitWindow {
  limit: number;
  windowMs: number;
  /** Read out in the error message, so it says "10 questions a minute" and not "10 per 60000". */
  label: string;
}

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfterSeconds: number };

export class RateLimiter {
  /**
   * Timestamps per caller, oldest first. Kept in memory on purpose: counting rows in
   * `AgentRun` afterwards would be exact but too late — a hundred concurrent requests would all
   * pass the check before the first row was written. Admission has to be counted at admission.
   *
   * The cost of that choice is that a restart forgives everyone. Nobody can force a restart, so
   * the trade is fine. Growth is bounded by the number of distinct users who have ever asked a
   * question in this process, each holding at most `limit` numbers.
   */
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly windows: RateLimitWindow[]) {}

  /**
   * Records an attempt and says whether it may proceed.
   *
   * A refused attempt is NOT recorded. Otherwise a client that retries in a tight loop would keep
   * pushing its own window forward and never be let back in — the limit would become a ban.
   */
  take(key: string, now: number = Date.now()): RateLimitVerdict {
    const longestMs = Math.max(...this.windows.map((window) => window.windowMs));
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < longestMs);
    this.hits.set(key, recent);

    for (const window of this.windows) {
      const inWindow = recent.filter((at) => now - at < window.windowMs);
      if (inWindow.length >= window.limit) {
        // The oldest hit in this window is the one whose expiry frees a slot.
        const freesAt = inWindow[0] + window.windowMs;
        return {
          allowed: false,
          reason: `${window.limit} questions ${window.label}`,
          retryAfterSeconds: Math.max(1, Math.ceil((freesAt - now) / 1000)),
        };
      }
    }

    recent.push(now);
    return { allowed: true };
  }
}

/** `typeof process` guarded because this file is meant to run in the browser too (plan §4.5b). */
function envInt(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * One instance for the whole process, because the thing being limited — the app's single provider
 * key — is also one per process. Ten a minute is generous for a person typing questions and
 * ruinous for a loop, which is exactly the line this is trying to draw.
 */
export const agentRateLimiter = new RateLimiter([
  { limit: envInt('AGENT_RATE_LIMIT_PER_MINUTE', 10), windowMs: 60_000, label: 'a minute' },
  { limit: envInt('AGENT_RATE_LIMIT_PER_HOUR', 100), windowMs: 3_600_000, label: 'an hour' },
]);
