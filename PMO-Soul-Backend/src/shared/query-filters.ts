/**
 * The filter vocabulary this app accepts, and the single parser for it.
 *
 * Used by the list endpoint (via buildWhereFromFilters, which understands the query-string key
 * form 'amount_gte') and by the aggregate endpoint (via applyFilterClause, which is handed the
 * field and operator already separated). Neither has a filter language of its own.
 */

/**
 * Every operator, in the exact spelling a caller must use.
 *
 * 'equals' is the default when none is given, which is why a bare '?status=OPEN' works.
 */
export const FILTER_OPERATORS = [
  'equals',
  'contains',
  'startsWith',
  'endsWith',
  'gt',
  'gte',
  'lt',
  'lte',
  'ne',
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export function isFilterOperator(operator: string): operator is FilterOperator {
  return (FILTER_OPERATORS as readonly string[]).includes(operator);
}

/**
 * One model's columns, classified. Generated per model from the Prisma schema, never hand-written:
 * the classification decides how a wire value is coerced, and a stale list coerces wrongly.
 */
export interface EntityFilterSpec {
  /** Every non-relation column. A filter on anything else is not a filter on this table. */
  fields: string[];
  stringFields: string[];
  /** Int, BigInt, Float and Decimal together — everything that can be totalled or averaged. */
  numberFields: string[];
  intFields: string[];
  bigintFields: string[];
  dateFields: string[];
  /**
   * Columns holding a LIST of values (Prisma `String[]`, `Int[]`).
   *
   * They are filterable, but nothing can be folded over them: the database has no single value per
   * row to total, and asking Prisma to try is a 500 rather than a refusal.
   */
  listFields: string[];
}

/** 'amount_gte' -> { amount, gte }. A key with no suffix means equals. */
export function parseFilterKey(key: string): { field: string; operator: string } {
  const parts = key.split('_');
  return {
    field: parts[0],
    operator: parts.length > 1 ? parts.slice(1).join('_') : 'equals',
  };
}

/**
 * Wire value -> the type the column actually takes, or undefined when it cannot be used.
 *
 * By the column's REAL type: parseInt on a Decimal/Float filter used to drop the fraction
 * ('10.5' matched 10), and a BigInt beyond 2^53 needs BigInt rather than Number.
 */
export function coerceFilterValue(
  field: string,
  value: unknown,
  spec: EntityFilterSpec,
): unknown | undefined {
  if (spec.numberFields.includes(field) && typeof value === 'string') {
    const trimmed = value.trim();
    if (spec.bigintFields.includes(field)) {
      if (!/^-?\d+$/.test(trimmed)) return undefined;
      return BigInt(trimmed);
    }
    const parsed = spec.intFields.includes(field) ? parseInt(trimmed, 10) : Number(trimmed);
    if (isNaN(parsed)) return undefined;
    return parsed;
  }
  if (spec.dateFields.includes(field) && typeof value === 'string') {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed;
  }
  return value;
}

/**
 * Apply ONE clause to a Prisma where object.
 *
 * Returns false when the clause could not be used — an unknown column, a value that does not
 * parse as the column's type, or a text operator on a number. The list endpoint ignores a false
 * (it has always skipped filters it could not read); the aggregate endpoint turns it into a
 * refusal, because a dropped filter there means a number that is confidently wrong.
 */
export function applyFilterClause(
  where: Record<string, any>,
  field: string,
  operator: string,
  value: unknown,
  spec: EntityFilterSpec,
): boolean {
  if (!spec.fields.includes(field)) return false;

  const filterValue = coerceFilterValue(field, value, spec);
  if (filterValue === undefined) return false;

  const isText = !spec.numberFields.includes(field) && !spec.dateFields.includes(field);

  try {
    switch (operator) {
      case 'equals':
        where[field] = filterValue;
        return true;
      case 'contains':
        if (!isText) return false;
        where[field] = { contains: filterValue, mode: 'insensitive' };
        return true;
      case 'startsWith':
        if (!isText) return false;
        where[field] = { startsWith: filterValue, mode: 'insensitive' };
        return true;
      case 'endsWith':
        if (!isText) return false;
        where[field] = { endsWith: filterValue, mode: 'insensitive' };
        return true;
      case 'gt':
        where[field] = { gt: filterValue };
        return true;
      case 'gte':
        where[field] = { gte: filterValue };
        return true;
      case 'lt':
        where[field] = { lt: filterValue };
        return true;
      case 'lte':
        where[field] = { lte: filterValue };
        return true;
      case 'ne':
        where[field] = { not: filterValue };
        return true;
      default:
        // An operator this app does not know is treated as equality by the list endpoint, which is
        // its long-standing behaviour. The aggregate endpoint checks isFilterOperator() first and
        // never reaches this branch.
        where[field] = filterValue;
        return true;
    }
  } catch (_) {
    return false;
  }
}

/**
 * Build a where from the list endpoint's query-string filters.
 *
 * Skips what it cannot read, which is deliberate for a list: a bad filter shows more rows, not a
 * wrong number.
 */
export function buildWhereFromFilters(
  filters: Record<string, unknown> | undefined,
  spec: EntityFilterSpec,
  where: Record<string, any> = {},
): Record<string, any> {
  for (const [key, value] of Object.entries(filters || {})) {
    // Absent, not falsy: a legitimate 0 or false must reach the parser.
    if (value === undefined || value === null || value === '') continue;
    if (key === 'q') continue;
    const { field, operator } = parseFilterKey(key);
    applyFilterClause(where, field, operator, value, spec);
  }
  return where;
}
