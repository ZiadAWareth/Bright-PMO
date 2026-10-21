import { evaluate, type PulseExecutor } from '../../../core';

/**
 * Iteration is driven at the interpreter level (via meta.loop='while'): before
 * each pass it exposes `index`, and while the condition holds AND the iteration is
 * below `maxIterations` it routes to the `body` edge; otherwise to `done`. The max
 * guard is mandatory — it prevents an unbounded loop.
 *
 * Run on its own (Test step) it only previews the first check: would the body run at all.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const indexVar = String(inputs.index ?? 'index');
  const max = Number(inputs.maxIterations ?? 1000);
  const holds = max > 0 && evaluate(String(inputs.condition ?? ''), { ...ctx.variables, [indexVar]: 0 });
  return {
    outputs: {
      conditionAtStart: holds,
      firstPass: holds ? { [indexVar]: 0 } : null,
      maxIterations: max,
    },
  };
};
