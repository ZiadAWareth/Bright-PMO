import { evaluate, type PulseExecutor } from '../../../core';

/**
 * Asserts a condition. On pass it leaves variables untouched (no outputs). On
 * failure it emits a named business error, catchable by an error boundary event
 * (Wave 4). Replaces the legacy Validate stub, which did nothing.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const ok = evaluate(String(inputs.condition ?? ''), ctx.variables as Record<string, unknown>);
  if (ok) return { outputs: {} };
  return {
    error: {
      name: String(inputs.errorName ?? 'ValidationFailed'),
      message: String(inputs.message ?? 'Validation failed.'),
    },
  };
};
