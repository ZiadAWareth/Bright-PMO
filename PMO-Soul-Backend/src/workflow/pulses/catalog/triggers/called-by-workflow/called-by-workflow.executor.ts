import type { PulseExecutor } from '../../../core';

/**
 * Start marker — the Call Workflow step's runner (services.runWorkflow) shapes what the caller
 * passed by this trigger's declared inputs and starts the run with it under `input`. Not invoked
 * mid-flow.
 */
export const execute: PulseExecutor = async () => ({ outputs: {} });
