import type { PulseExecutor } from '../../../core';

/** Start marker — the trigger subsystem seeds `record` + `changedFields`. Not
 *  invoked mid-flow. `watchFields` narrows which updates fire the workflow. */
export const execute: PulseExecutor = async () => ({ outputs: {} });
