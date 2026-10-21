import type { PulseExecutor } from '../../../core';

/** Emits the terminal success signal; the interpreter completes the instance. */
export const execute: PulseExecutor = async () => ({ end: { status: 'success' } });
