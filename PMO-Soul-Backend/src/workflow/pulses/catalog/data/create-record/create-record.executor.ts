import type { PulseExecutor } from '../../../core';

/** Creates a record via the injected repository port. Templates in `data` are
 *  resolved by the wrapper before this runs. */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  if (!entity) return { error: { name: 'MissingEntity', message: 'Create Record requires an entity.' } };
  const data = inputs.data && typeof inputs.data === 'object' ? (inputs.data as Record<string, unknown>) : {};
  const record = await ctx.services.repo(entity).create(data);
  return { outputs: { record } };
};
