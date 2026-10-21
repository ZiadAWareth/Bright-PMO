import type { Pulse } from './pulse.contract';

/**
 * Step types that were removed from the catalogue.
 *
 * A workflow saved before a removal can still hold such a step. It is not in the palette, the AI's
 * catalogue or the registry any more; Save refuses a workflow that still has one and says what to
 * use instead (graph-rules.ts). A RUN that reaches one — a workflow nobody has edited since — skips
 * it with a warning instead of failing, which is only safe because every type here never did
 * anything a later step could depend on.
 */
export const RETIRED_PULSES: Record<string, { label: string; instead: string }> = {
  // Removed 2026-10-13: it only wrote a line to the server log (never notified anyone), and
  // "escalation" is business logic a workflow should spell out with its own steps.
  'control.escalate': {
    label: 'Escalate',
    instead: 'It only wrote a line to the server log. Delete it, or use Send In-App Notification to tell someone.',
  },
  // Removed 2026-10-15: public sign-up is now a switch in Settings → Sign-in & Email that creates
  // the account itself. Nothing can start a workflow from this trigger any more.
  'trigger.signUpRequested': {
    label: 'On Sign-up Requested',
    instead:
      'Public sign-up is now turned on in Settings → Sign-in & Email and creates the account itself. To act on a new account, start the workflow with the "created" trigger on the User table instead.',
  },
};

/** The stand-in a run uses for a removed step: logs that it was skipped, then carries on. */
export function retiredPassThrough(type: string): Pulse | undefined {
  const retired = RETIRED_PULSES[type];
  if (!retired) return undefined;
  return {
    meta: { type, category: 'control', label: retired.label + ' (removed)', description: retired.instead, async: 'never', hasSideEffects: false },
    config: [],
    io: { inputs: [], outputs: [] },
    execute: async (_inputs, ctx) => {
      ctx.services.log('warn', `Skipped a removed "${retired.label}" step: ${retired.instead}`);
      return { outputs: {} };
    },
  };
}
