import type { PulseExecutor } from '../../../core';

/**
 * Updates a record. When `expectedVersion` is set, it enforces optimistic
 * concurrency: if the stored `version` differs, it emits `OptimisticLockConflict`
 * instead of overwriting. (A Prisma-backed repo should push the version into the
 * update's where-clause for a fully atomic check-and-set; here it is read-compare-
 * write, which is sufficient for the sideways engine and its tests.)
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  const id = inputs.id;
  if (!entity || id == null || id === '') {
    return { error: { name: 'MissingTarget', message: 'Update Record requires an entity and id.' } };
  }
  const repo = ctx.services.repo(entity);
  const data = inputs.data && typeof inputs.data === 'object' ? { ...(inputs.data as Record<string, unknown>) } : {};

  // Look the record up first so a missing one is a plain NotFound, not a Prisma stack trace. In a
  // test run the usual cause is schema-generated sample data ("id": 1) with no such row: say so.
  const current = await repo.findUnique({ id });
  if (!current) {
    const hint = ctx.isTest
      ? ` The test data is a sample, not a real record — create a ${entity} first, or pick "Load real record" in the Test dialog.`
      : '';
    return { error: { name: 'NotFound', message: `No ${entity} #${id} to update.${hint}` } };
  }
  if (inputs.expectedVersion != null && inputs.expectedVersion !== '') {
    if (current.version !== inputs.expectedVersion) {
      return { error: { name: 'OptimisticLockConflict', message: `${entity} #${id} was modified concurrently.` } };
    }
    const record = await repo.update({ id }, { ...data, version: Number(current.version ?? 0) + 1 });
    return { outputs: { record } };
  }

  const record = await repo.update({ id }, data);
  return { outputs: { record } };
};
