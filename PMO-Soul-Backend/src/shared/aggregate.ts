import type { EntityFilterSpec } from './query-filters';
import { FILTER_OPERATORS, applyFilterClause, isFilterOperator } from './query-filters';

/** The five folds a caller may ask for. One endpoint answers all of them. */
export const AGGREGATE_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'] as const;
export type AggregateFn = (typeof AGGREGATE_FUNCTIONS)[number];

/** Prisma's key for each fold, which is also PGlite's (shared/repository.ts AggregateSpec). */
const SELECT_KEY: Record<AggregateFn, string> = {
  sum: '_sum',
  avg: '_avg',
  min: '_min',
  max: '_max',
  count: '_count',
};

/**
 * A refusal the caller can act on.
 *
 * Carries the reason in the message — which field, which operator, and what this table actually
 * offers — because the caller is usually a page designer wiring a card, not a person who can go
 * and read the schema.
 */
export class AggregateRequestError extends Error {
  readonly code = 'AGGREGATE_INVALID';
  constructor(message: string) {
    super(message);
    this.name = 'AggregateRequestError';
  }
}

export interface AggregateWhereClause {
  field: string;
  /** One of FILTER_OPERATORS. Omitted means equals, exactly as on the list endpoint. */
  op?: string;
  value?: unknown;
}

export interface AggregateRequest {
  fn?: string;
  field?: string;
  where?: AggregateWhereClause[];
}

/** 'date' only ever comes from min/max on a DateTime column; everything else is a number. */
export type AggregateValueType = 'number' | 'date';

export interface AggregatePlan {
  fn: AggregateFn;
  /** null only for a bare count. */
  field: string | null;
  valueType: AggregateValueType;
  where: Record<string, any>;
}

export interface AggregateResponse {
  /** null means "no rows matched", which is not the same as zero and is not reported as zero. */
  value: number | string | null;
  /** 'date' -> value is an ISO string. A card that only renders numbers can check this. */
  valueType: AggregateValueType;
  fn: AggregateFn;
  field: string | null;
  entity: string;
}

function list(names: readonly string[]): string {
  return names.length ? names.join(', ') : 'none';
}

/**
 * Validate a request against the model's real columns and turn it into a plan.
 *
 * Field rules:
 *   sum, avg      numeric columns only (Int, BigInt, Float, Decimal). Totalling a status string is
 *                 not a thing this app can do, and answering 0 would look like an answer.
 *   min, max      numeric OR DateTime. 'earliest order' and 'latest login' are ordinary dashboard
 *                 cards, and a column that has an order has a smallest and a largest.
 *   count         field optional. Given one, it counts the rows where that column is SET, which is
 *                 what COUNT(col) means; omitted, it counts rows.
 */
export function planAggregate(
  entity: string,
  request: AggregateRequest | undefined | null,
  spec: EntityFilterSpec,
): AggregatePlan {
  const fn = String(request?.fn ?? '').trim();
  if (!(AGGREGATE_FUNCTIONS as readonly string[]).includes(fn)) {
    throw new AggregateRequestError(
      'fn must be one of: ' + AGGREGATE_FUNCTIONS.join(', ') + '. Received: ' +
        (fn ? JSON.stringify(fn) : 'nothing') + '.',
    );
  }
  const func = fn as AggregateFn;

  let field: string | null = null;
  let valueType: AggregateValueType = 'number';

  const rawField = request?.field;
  const fieldGiven = typeof rawField === 'string' && rawField.trim() !== '';

  if (!fieldGiven && func !== 'count') {
    throw new AggregateRequestError(
      func + ' needs a field to work on; only count may be asked without one. Fields on ' +
        entity + ': ' + list(spec.fields) + '.',
    );
  }

  if (fieldGiven) {
    field = (rawField as string).trim();
    if (!spec.fields.includes(field)) {
      throw new AggregateRequestError(
        '"' + entity + '" has no field called "' + field + '". Its fields are: ' +
          list(spec.fields) + '.',
      );
    }
    if (spec.listFields.includes(field)) {
      throw new AggregateRequestError(
        '"' + entity + '.' + field + '" holds a list of values, so there is no single value per ' +
          'row to ' + func + '.',
      );
    }
    const isNumeric = spec.numberFields.includes(field);
    const isDate = spec.dateFields.includes(field);

    if ((func === 'sum' || func === 'avg') && !isNumeric) {
      throw new AggregateRequestError(
        '"' + entity + '.' + field + '" is not a numeric field, so it cannot be ' +
          (func === 'sum' ? 'totalled' : 'averaged') + '. Numeric fields on ' + entity + ': ' +
          list(spec.numberFields) + '.',
      );
    }
    if ((func === 'min' || func === 'max') && !isNumeric && !isDate) {
      throw new AggregateRequestError(
        '"' + entity + '.' + field + '" is neither numeric nor a date, so it has no ' + func +
          '. Numeric fields on ' + entity + ': ' + list(spec.numberFields) +
          '. Date fields: ' + list(spec.dateFields) + '.',
      );
    }
    if (isDate && (func === 'min' || func === 'max')) valueType = 'date';
  }

  return { fn: func, field, valueType, where: buildAggregateWhere(entity, request?.where, spec) };
}

/**
 * The same filter vocabulary the list endpoint takes, in array form.
 *
 * Every clause is parsed by shared/query-filters.ts — the list endpoint's own parser — so 'gte' on
 * a Decimal column means here exactly what it means there. What differs is the response to a clause
 * the parser cannot use: the list endpoint drops it and shows more rows, this refuses, because a
 * dropped filter here is a number that is wrong with no way to tell.
 */
export function buildAggregateWhere(
  entity: string,
  clauses: unknown,
  spec: EntityFilterSpec,
): Record<string, any> {
  const where: Record<string, any> = {};
  if (clauses === undefined || clauses === null) return where;

  if (!Array.isArray(clauses)) {
    throw new AggregateRequestError('where must be an array of { field, op, value } clauses.');
  }

  const seen = new Set<string>();
  for (const clause of clauses as AggregateWhereClause[]) {
    const field = String(clause?.field ?? '').trim();
    if (!field) {
      throw new AggregateRequestError('every where clause needs a field.');
    }
    if (!spec.fields.includes(field)) {
      throw new AggregateRequestError(
        '"' + entity + '" has no field called "' + field + '". Its fields are: ' +
          list(spec.fields) + '.',
      );
    }
    // One clause per field: the parser writes where[field], so a second clause on the same column
    // would overwrite the first. Refused rather than quietly losing half the filter.
    if (seen.has(field)) {
      throw new AggregateRequestError(
        'field "' + field + '" appears in more than one where clause; this endpoint takes one ' +
          'clause per field.',
      );
    }
    seen.add(field);

    const rawOp = clause?.op;
    const op = rawOp === undefined || rawOp === null || rawOp === '' ? 'equals' : String(rawOp);
    if (!isFilterOperator(op)) {
      throw new AggregateRequestError(
        '"' + op + '" is not a filter operator. This app accepts, on this endpoint and on the ' +
          'list endpoint alike: ' + FILTER_OPERATORS.join(', ') + '.',
      );
    }

    const value = clause?.value;
    if (value === undefined || value === null) {
      throw new AggregateRequestError('the where clause on "' + field + '" needs a value.');
    }
    if (spec.dateFields.includes(field) && typeof value !== 'string' && !(value instanceof Date)) {
      throw new AggregateRequestError(
        '"' + entity + '.' + field + '" is a date: give the value as an ISO date string.',
      );
    }

    if (!applyFilterClause(where, field, op, value, spec)) {
      throw new AggregateRequestError(
        'the value ' + JSON.stringify(value) + ' cannot be used with operator "' + op +
          '" on "' + entity + '.' + field + '".',
      );
    }
  }

  return where;
}

/** Which columns to fold, in the shape both PrismaRepository and PGliteRepository take. */
export function aggregateSelect(plan: AggregatePlan): Record<string, any> {
  if (plan.fn === 'count') {
    return plan.field ? { _count: { [plan.field]: true } } : { _count: true };
  }
  return { [SELECT_KEY[plan.fn]]: { [plan.field as string]: true } };
}

/**
 * Pull the one number out of the driver's answer.
 *
 * Every numeric type the schema allows arrives differently: Int as a number, BigInt as a bigint
 * (which JSON.stringify throws on), Decimal as an object, and a Postgres numeric through a raw
 * driver as a string. All four become a JS number here, so a card never has to ask which it got.
 */
export function readAggregateValue(plan: AggregatePlan, raw: any): number | string | null {
  const bucket = raw?.[SELECT_KEY[plan.fn]];
  const value =
    plan.fn === 'count'
      ? bucket !== null && typeof bucket === 'object'
        ? bucket[plan.field as string]
        : bucket
      : bucket === null || bucket === undefined
        ? null
        : bucket[plan.field as string];

  if (value === null || value === undefined) return null;

  if (plan.valueType === 'date') {
    const asDate = value instanceof Date ? value : new Date(String(value));
    return isNaN(asDate.getTime()) ? null : asDate.toISOString();
  }

  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  // Decimal and numeric-as-string both answer toString().
  const asNumber = Number(String(value));
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function buildAggregateResponse(
  entity: string,
  plan: AggregatePlan,
  raw: any,
): AggregateResponse {
  return {
    value: readAggregateValue(plan, raw),
    valueType: plan.valueType,
    fn: plan.fn,
    field: plan.field,
    entity,
  };
}
