import type { PulseExecutor } from '../../../core';

/**
 * Deletes a record.
 *
 * The catalogue previously had create / read / update / query but no delete, so
 * archival, purge, GDPR-erasure and cleanup processes had no native component and
 * had to be faked with an outbound API call to the app's own endpoint.
 *
 * "Not found" is an explicit choice rather than an assumption: a cleanup workflow
 * usually wants to continue, a compliance workflow usually must fail loudly.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  const id = inputs.id;
  if (!entity || id == null || id === '') {
    return { error: { name: 'MissingTarget', message: 'Delete Record requires an entity and id.' } };
  }

  const repo = ctx.services.repo(entity);
  const existing = await repo.findUnique({ id });

  if (!existing) {
    if (inputs.missing === 'ignore') {
      return { outputs: { deleted: null, skipped: true } };
    }
    return { error: { name: 'NotFound', message: `No ${entity} #${id}.` } };
  }

  if (inputs.mode === 'soft') {
    const deleted = await repo.update({ id }, { deletedAt: new Date().toISOString() });
    return { outputs: { deleted } };
  }

  const deleted = await repo.delete({ id });
  return { outputs: { deleted } };
};
