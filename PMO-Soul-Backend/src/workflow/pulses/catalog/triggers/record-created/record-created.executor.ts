import type { PulseExecutor } from '../../../core';

/**
 * Trigger nodes are start markers — the interpreter begins the token here and the
 * trigger subsystem seeds the instance with the created record (as `record`). This
 * executor exists for completeness and is not invoked mid-flow.
 */
export const execute: PulseExecutor = async () => ({ outputs: {} });
