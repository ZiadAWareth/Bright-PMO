import type { PulseExecutor } from '../../../core';

/**
 * The join is handled at the interpreter level (via meta.join='and') — it fires
 * once all incoming branches have arrived. This executor is not invoked in normal
 * operation; it exists to complete the pulse contract.
 */
export const execute: PulseExecutor = async () => ({ outputs: {} });
