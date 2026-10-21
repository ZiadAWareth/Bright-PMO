import type { PulseExecutor } from '../../../core';

/**
 * Emits no routing signal, so the interpreter follows ALL outgoing edges — every
 * branch is activated. Pair with a Parallel Join (AND) to reconverge.
 */
export const execute: PulseExecutor = async () => ({ outputs: {} });
