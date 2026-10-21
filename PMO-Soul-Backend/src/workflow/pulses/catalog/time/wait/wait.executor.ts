import { evaluate, matchesRules, type PulseContext, type PulseExecutor, type PulseResult, type Rule } from '../../../core';

const UNIT_MS: Record<string, number> = {
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
};

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** How often a TEST re-reads a watched record (the live clock looks every ~30 s). */
export const TEST_POLL_MS = 5_000;

/**
 * Sleep in a test, exactly as long as a live run would: through services.testWait when the
 * designer can see it (counted down on the canvas / in the step, with Skip), plainly otherwise.
 */
async function sleepInTest(ctx: PulseContext, ms: number, show: { until: number; label?: string }): Promise<'elapsed' | 'skipped'> {
  if (ctx.services.testWait) return ctx.services.testWait(ms, show);
  await new Promise((r) => setTimeout(r, ms));
  return 'elapsed';
}

/** A record / condition wait that gave up — what the clock does live, done in the test. */
function gaveUp(onTimeout: string, what: string): PulseResult {
  if (onTimeout === 'fail') {
    return { error: { name: 'WaitTimedOut', message: `Gave up waiting: ${what} did not meet the conditions in time.` } };
  }
  if (onTimeout === 'continue') return { outputs: {} };
  return { outputs: {}, branch: 'timeout' };
}

/**
 * Emits a durable wait. The interpreter records it as a WorkflowTimer row and parks the run; the
 * workflow clock (workflow-clock.service.ts) resumes it when the timer is due, the watched record
 * meets the conditions, or the deadline passes.
 *
 * A TEST waits exactly as a live run does — the full time, or until the watched record meets the
 * conditions (re-read every TEST_POLL_MS), or until it gives up and takes its timeout behaviour —
 * in-process instead of parked, and the designer can Skip it (carry on as if it were done).
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (inputs.mode === 'condition') {
    // Saved before the record watch existed: a {{expression}} over the run's own variables. Kept
    // running as it did; it is no longer offered.
    const legacy = String(inputs.condition ?? '').trim();
    const entity = String(inputs.entity ?? '').trim();
    if (!entity && legacy) {
      if (ctx.isTest) {
        const until = Date.parse(deadline(inputs));
        for (;;) {
          if (evaluate(legacy, ctx.variables)) return { outputs: {} };
          const left = until - Date.now();
          if (left <= 0) return gaveUp(String(inputs.onTimeout ?? 'fail'), 'condition "' + legacy + '"');
          if ((await sleepInTest(ctx, Math.min(TEST_POLL_MS, left), { until, label: 'Waiting for the condition' })) === 'skipped') return { outputs: {} };
        }
      }
      return { wait: { kind: 'condition', config: { condition: legacy, deadline: deadline(inputs), onTimeout: inputs.onTimeout ?? 'fail' } } };
    }

    if (!entity) return { error: { name: 'MissingRecord', message: 'Choose the table of the record to wait on.' } };
    // Left as shown ({{record.id}}, the form's default, is never saved): the record the run started with.
    const id = inputs.recordId ?? (ctx.variables as any)?.record?.id;
    if (id === undefined || id === null || String(id).trim() === '') {
      return { error: { name: 'MissingRecord', message: 'Choose which record to wait on (e.g. drag in the record’s id).' } };
    }
    const rules = (Array.isArray(inputs.rules) ? inputs.rules : []).filter((r: any) => r && String(r.field ?? '').trim()) as Rule[];
    if (!rules.length) {
      return { error: { name: 'MissingCondition', message: 'Add at least one condition the record must meet.' } };
    }
    const as = String(inputs.as ?? 'watchedRecord').trim() || 'watchedRecord';
    if (!NAME.test(as)) {
      return { error: { name: 'InvalidName', message: '"Store the record as" must be a variable name, e.g. watchedRecord.' } };
    }
    const logic = String(inputs.logic ?? 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';

    if (ctx.isTest) {
      const until = Date.parse(deadline(inputs));
      const what = `the ${entity} record #${id}`;
      for (;;) {
        const record = await ctx.services.repo(entity).findUnique({ id });
        if (!record) return { error: { name: 'NotFound', message: `Stopped waiting: ${what} no longer exists.` } };
        if (matchesRules({ rules, logic }, record as Record<string, unknown>)) return { outputs: { [as]: record } };
        const left = until - Date.now();
        if (left <= 0) return gaveUp(String(inputs.onTimeout ?? 'fail'), what);
        const slept = await sleepInTest(ctx, Math.min(TEST_POLL_MS, left), { until, label: `Waiting for ${entity} #${id}` });
        if (slept === 'skipped') {
          // Skip = carry on as if the conditions were met, with the record as it is now.
          const now = await ctx.services.repo(entity).findUnique({ id });
          return { outputs: { [as]: now ?? record } };
        }
      }
    }

    return {
      wait: {
        kind: 'condition',
        config: {
          watch: { entity, id, logic, rules, as },
          deadline: deadline(inputs),
          onTimeout: inputs.onTimeout ?? 'fail',
        },
      },
    };
  }

  const unit = String(inputs.unit ?? 'minutes');
  const amount = Number(inputs.amount ?? 0);
  const durationMs = amount * (UNIT_MS[unit] ?? UNIT_MS.minutes);

  if (ctx.isTest) {
    // The full time, as live (an unreadable / past date continues at once, as live). Skip or Stop
    // end it early; a stopped test rejects here, and the run ends at this step.
    const ms = inputs.mode === 'until' ? Date.parse(String(inputs.until ?? '')) - Date.now() : durationMs;
    if (!Number.isFinite(ms) || ms <= 0) return { outputs: {} };
    await sleepInTest(ctx, ms, { until: Date.now() + ms });
    return { outputs: {} };
  }

  if (inputs.mode === 'until') {
    return { wait: { kind: 'timer', config: { until: String(inputs.until ?? '') } } };
  }
  return { wait: { kind: 'timer', config: { durationMs } } };
};

/**
 * When a record wait gives up. "Give up after" + unit; a workflow saved before those existed kept
 * its deadline in hours (timeoutHours). Mandatory: a wait with no way out is a run that silently
 * never finishes, which is worse than one that fails.
 */
function deadline(inputs: Record<string, unknown>): string {
  const amount = Number(inputs.giveUpAfter);
  let ms: number;
  if (inputs.giveUpAfter !== undefined && Number.isFinite(amount) && amount > 0) {
    ms = amount * (UNIT_MS[String(inputs.giveUpUnit ?? 'days')] ?? UNIT_MS.days);
  } else {
    const hours = Number(inputs.timeoutHours);
    ms = (Number.isFinite(hours) && hours > 0 ? hours : 24) * UNIT_MS.hours;
  }
  return new Date(Date.now() + ms).toISOString();
}
