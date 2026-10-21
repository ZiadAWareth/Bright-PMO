import type { PulseExecutor } from '../../../core';

/**
 * Start events are not executed mid-flow — the interpreter treats a trigger node
 * as the start marker, and the trigger subsystem seeds the instance's variables.
 * This executor exists so the pulse is complete and directly testable, and so a
 * future trigger subsystem can call it to validate/normalise the seed: it asserts
 * a record is present when the start source is a record.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (inputs.source === 'record' && ctx.variables.record == null) {
    return { error: { name: 'NoTriggerRecord', message: 'Manual start from a record requires a record in context.' } };
  }
  return { outputs: {} };
};
