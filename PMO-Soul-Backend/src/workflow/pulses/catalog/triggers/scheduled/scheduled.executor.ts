import type { PulseExecutor } from '../../../core';

/** Start marker — the workflow clock (workflow-clock.service.ts) starts the run when the
 *  schedule is due and seeds firedAt / cron / timezone. Not invoked mid-flow. */
export const execute: PulseExecutor = async () => ({ outputs: {} });
