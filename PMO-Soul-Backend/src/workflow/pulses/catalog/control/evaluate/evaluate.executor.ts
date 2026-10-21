import { evaluate, type PulseExecutor } from '../../../core';

/**
 * Evaluates a boolean expression and writes the result to the chosen variable.
 * {{templates}} in the expression are resolved by the wrapper before this runs, so
 * the executor evaluates the already-substituted string.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const as = String(inputs.as ?? 'result').trim() || 'result';
  const value = evaluate(String(inputs.expression ?? ''), ctx.variables as Record<string, unknown>);
  return { outputs: { [as]: value } };
};
