import type { PulseExecutor } from '../../../core';

/** Filter / sort / paginate → a collection plus its total count. */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  if (!entity) return { error: { name: 'MissingEntity', message: 'Query Records requires an entity.' } };
  const repo = ctx.services.repo(entity);
  const where = inputs.where && typeof inputs.where === 'object' ? (inputs.where as Record<string, unknown>) : {};
  const orderBy = inputs.orderBy && typeof inputs.orderBy === 'object' ? (inputs.orderBy as Record<string, 'asc' | 'desc'>) : undefined;
  const page = Number(inputs.page ?? 0);
  const pageSize = Number(inputs.pageSize ?? 0);

  const args: Record<string, unknown> = { where };
  if (orderBy) args.orderBy = orderBy;
  if (pageSize > 0) {
    args.skip = page * pageSize;
    args.take = pageSize;
  }

  const [records, total] = await Promise.all([repo.findMany(args), repo.count({ where })]);
  return { outputs: { records, total, page, pageSize } };
};
