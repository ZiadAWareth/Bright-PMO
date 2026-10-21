import type { PulseExecutor } from '../../../core';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

/**
 * Emits a message to the injected log/audit sink. The message is template-resolved
 * by the wrapper first. Side-effecting (writes to the sink) but idempotent-safe to
 * replay.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const level: Level = LEVELS.includes(inputs.level as Level) ? (inputs.level as Level) : 'info';
  ctx.services.log(level, String(inputs.message ?? ''), {
    runId: ctx.run.id,
    workflowId: ctx.run.workflowId,
  });
  return { outputs: {} };
};
