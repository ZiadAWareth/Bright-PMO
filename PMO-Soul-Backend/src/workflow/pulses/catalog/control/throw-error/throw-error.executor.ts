import type { PulseExecutor } from '../../../core';

/** Unconditionally raises a named business error (unlike Validate, which asserts a
 *  condition first). Routes to the node's `error` edge if present, else fails the run. */
export const execute: PulseExecutor = async (inputs) => ({
  error: {
    name: String(inputs.errorName ?? 'BusinessError'),
    message: String(inputs.message ?? 'An error was thrown.'),
  },
});
