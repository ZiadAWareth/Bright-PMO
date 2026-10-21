/**
 * Pure, in-memory implementations of Prisma's `groupBy` and `aggregate` shapes.
 *
 * Why this file exists: `PulseRepository` now has `groupBy` and `aggregate`, and three of its
 * four implementations have no SQL engine behind them — the unit-test repo, the designer
 * sandbox overlay, and (for its overlay half) the preview host. Each of those would otherwise
 * grow its own copy of "bucket the rows, then sum the numbers", and three copies of an
 * aggregation is three chances to disagree about what `_avg` does with a null.
 *
 * The Prisma-backed repository does NOT use this — it forwards to the database, which is the
 * whole point of having the method. This is the fallback for hosts without one.
 *
 * Deliberately matches Prisma's argument and result shapes rather than inventing a nicer API:
 * the agent's query tool is written once against that shape and must behave identically no
 * matter which host answers it.
 */

export interface GroupByArgs {
  /**
   * Fields to bucket by. A row's group is the tuple of these values.
   *
   * Optional here, unlike the SQL-backed port, because these arguments arrive through
   * `PulseRepository` as an untyped record. Omitting it puts every row in one bucket, which is
   * the same thing `aggregate` does — a defensible answer rather than a crash.
   */
  by?: string[];
  where?: Record<string, unknown>;
  _count?: true | Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  /** Single-key ordering, over a `by` field or `{ _count: 'desc' }`. */
  orderBy?: Record<string, unknown>;
  skip?: number;
  take?: number;
}

export interface AggregateArgs {
  where?: Record<string, unknown>;
  _count?: true | Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

type Row = Record<string, unknown>;

const selected = (spec: Record<string, boolean> | undefined): string[] =>
  Object.entries(spec ?? {})
    .filter(([, on]) => on)
    .map(([field]) => field);

/** Nulls are skipped, not treated as zero — averaging over absent values would invent data. */
function numbers(rows: Row[], field: string): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    const asNumber = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(asNumber)) out.push(asNumber);
  }
  return out;
}

/** Works for numbers, strings and dates — the three things anyone asks the min/max of. */
function comparableExtreme(rows: Row[], field: string, wantMax: boolean): unknown {
  let best: unknown;
  let seen = false;
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (!seen) {
      best = value;
      seen = true;
      continue;
    }
    const a = value instanceof Date ? value.getTime() : (value as any);
    const b = best instanceof Date ? best.getTime() : (best as any);
    if (wantMax ? a > b : a < b) best = value;
  }
  return seen ? best : null;
}

function applyAggregates(rows: Row[], args: AggregateArgs | GroupByArgs): Row {
  const out: Row = {};

  if (args._count === true) {
    out._count = rows.length;
  } else if (args._count) {
    // Per-field count means "how many rows have a non-null value here", which is not the same
    // as the row count and is the reason Prisma allows the distinction at all.
    const counts: Row = {};
    for (const field of selected(args._count)) {
      counts[field] = rows.filter((row) => row[field] !== null && row[field] !== undefined).length;
    }
    out._count = counts;
  }

  const sums = selected(args._sum);
  if (sums.length) {
    const value: Row = {};
    for (const field of sums) {
      const values = numbers(rows, field);
      // Prisma returns null for the sum of nothing rather than 0 — "no rows" and "sums to zero"
      // are different answers and the agent will report them differently.
      value[field] = values.length ? values.reduce((a, b) => a + b, 0) : null;
    }
    out._sum = value;
  }

  const avgs = selected(args._avg);
  if (avgs.length) {
    const value: Row = {};
    for (const field of avgs) {
      const values = numbers(rows, field);
      value[field] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }
    out._avg = value;
  }

  const mins = selected(args._min);
  if (mins.length) {
    const value: Row = {};
    for (const field of mins) value[field] = comparableExtreme(rows, field, false);
    out._min = value;
  }

  const maxs = selected(args._max);
  if (maxs.length) {
    const value: Row = {};
    for (const field of maxs) value[field] = comparableExtreme(rows, field, true);
    out._max = value;
  }

  return out;
}

/**
 * Buckets already-filtered rows and aggregates each bucket.
 *
 * Takes rows rather than a `where`, because every caller has its own idea of what filtering
 * means — the sandbox merges an overlay, the preview host runs SQL. Filtering is theirs;
 * grouping is shared.
 */
export function groupRows(rows: Row[], args: GroupByArgs): Row[] {
  const by = args.by ?? [];
  const buckets = new Map<string, { key: Row; rows: Row[] }>();

  for (const row of rows) {
    const key: Row = {};
    for (const field of by) key[field] = row[field] ?? null;
    // JSON of the ordered tuple: stable, and distinguishes 1 from '1', which a joined string
    // would not.
    const id = JSON.stringify(by.map((field) => key[field]));
    const bucket = buckets.get(id);
    if (bucket) bucket.rows.push(row);
    else buckets.set(id, { key, rows: [row] });
  }

  let out = [...buckets.values()].map((bucket) => ({
    ...bucket.key,
    ...applyAggregates(bucket.rows, args),
  }));

  const orderBy = args.orderBy;
  if (orderBy) {
    const [field, rawDirection] = Object.entries(orderBy)[0] ?? [];
    if (field) {
      // `{ _count: 'desc' }` — order by the group size. This is the "top 5 by volume" question,
      // which is most of what anyone actually wants from a groupBy.
      const direction =
        typeof rawDirection === 'string'
          ? rawDirection
          : Object.values(rawDirection ?? {})[0] ?? 'asc';
      const pick = (bucket: Row): any => {
        const value = bucket[field];
        return value && typeof value === 'object' ? Object.values(value)[0] : value;
      };
      out = [...out].sort((x, y) => {
        const a = pick(x);
        const b = pick(y);
        const cmp = a > b ? 1 : a < b ? -1 : 0;
        return cmp * (direction === 'desc' ? -1 : 1);
      });
    }
  }

  if (args.skip) out = out.slice(args.skip);
  if (args.take != null) out = out.slice(0, args.take);
  return out;
}

/** Aggregates already-filtered rows into a single Prisma-shaped result. */
export function aggregateRows(rows: Row[], args: AggregateArgs): Row {
  // Prisma defaults to no aggregates at all; an empty result is useless to a caller who
  // forgot to ask, so a bare `aggregate({ where })` answers the obvious question.
  const effective: AggregateArgs =
    args._count || args._sum || args._avg || args._min || args._max ? args : { ...args, _count: true };
  return applyAggregates(rows, effective);
}
