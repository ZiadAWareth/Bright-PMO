import type { PulseExecutor } from '../../../core';

/**
 * Start marker — the receive endpoint (webhook.controller.ts, /api/webhooks/:path) checks the
 * secret, then starts the run with payload / headers / query / method. Not invoked mid-flow.
 */
export const execute: PulseExecutor = async () => ({ outputs: {} });
