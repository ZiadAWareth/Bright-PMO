import type { PulseExecutor } from '../../../core';

/**
 * Emits the terminal error signal with a named error; the interpreter marks the
 * run FAILED and records the error name so a caller (or a Call-Sub-Workflow pulse
 * later) can catch it.
 */
export const execute: PulseExecutor = async (inputs) => ({
  end: { status: 'error', errorName: String(inputs.errorName ?? 'Error') },
});
