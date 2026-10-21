import type { PulseExecutor } from '../../../core';

/** Loads one record by id or a where filter. Emits `NotFound` if nothing matches. */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  if (!entity) return { error: { name: 'MissingEntity', message: 'Read Record requires an entity.' } };
  const optional = Boolean(inputs.optional);
  const as = String(inputs.as ?? 'record').trim() || 'record';
  // Emit the record under `record` AND a caller-chosen name so a flow can load
  // several records (owner + contact) without clobbering each other.
  const emit = (rec: unknown) => ({ outputs: as === 'record' ? { record: rec } : { record: rec, [as]: rec } });

  const where =
    inputs.where && typeof inputs.where === 'object'
      ? (inputs.where as Record<string, unknown>)
      : inputs.id != null && inputs.id !== ''
        ? { id: inputs.id }
        : null;
  // `optional` (e.g. an owner lookup used only to address a notification) degrades
  // gracefully: a missing id or no match yields a null record instead of failing
  // the run, so downstream {{name.field}} is simply empty.
  if (!where) {
    return optional ? emit(null) : { error: { name: 'MissingLookup', message: 'Read Record requires an id or a where filter.' } };
  }
  const record = await ctx.services.repo(entity).findUnique(where);
  if (!record) {
    return optional ? emit(null) : { error: { name: 'NotFound', message: `No ${entity} matched the lookup.` } };
  }
  return emit(record);
};
