import type { PulseExecutor } from '../../../core';

/**
 * Ends the whole instance immediately. The interpreter returns from the token walk
 * on an `end` signal, abandoning any still-queued branches — i.e. it terminates all
 * active tokens, not just this path.
 */
export const execute: PulseExecutor = async (inputs) => {
  const status = inputs.status === 'error' ? 'error' : 'success';
  return {
    end: {
      status,
      errorName: status === 'error' ? String(inputs.errorName ?? 'Terminated') : undefined,
    },
  };
};
