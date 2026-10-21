import type { PulseExecutor } from '../../../core';

/** Start marker — the trigger subsystem seeds the deleted `record`. Not invoked mid-flow. */
export const execute: PulseExecutor = async () => ({ outputs: {} });
