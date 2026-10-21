/**
 * SQL query builders for PGlite.
 * Translates Prisma-like query args into raw SQL strings.
 * Type coercion for WHERE clause values only — NO DDL generation.
 */

export function buildSelectQuery(
  table: string,
  args?: { where?: Record<string, any>; orderBy?: Record<string, 'asc' | 'desc'>; skip?: number; take?: number },
): { sql: string; params: any[] } {
  const params: any[] = [];
  let sql = `SELECT * FROM "${table}"`;

  if (args?.where) {
    const { clause, values } = buildWhereClause(args.where, params.length);
    if (clause) {
      sql += ` WHERE ${clause}`;
      params.push(...values);
    }
  }

  if (args?.orderBy) {
    const entries = Object.entries(args.orderBy);
    if (entries.length > 0) {
      const orderParts = entries.map(([col, dir]) => `"${col}" ${dir.toUpperCase()}`);
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }
  }

  if (args?.take !== undefined) {
    params.push(args.take);
    sql += ` LIMIT $${params.length}`;
  }

  if (args?.skip !== undefined) {
    params.push(args.skip);
    sql += ` OFFSET $${params.length}`;
  }

  return { sql, params };
}

export function buildCountQuery(
  table: string,
  args?: { where?: Record<string, any> },
): { sql: string; params: any[] } {
  const params: any[] = [];
  let sql = `SELECT COUNT(*)::int AS count FROM "${table}"`;

  if (args?.where) {
    const { clause, values } = buildWhereClause(args.where, params.length);
    if (clause) {
      sql += ` WHERE ${clause}`;
      params.push(...values);
    }
  }

  return { sql, params };
}

/**
 * Column and table names cannot be parameterized, so they are interpolated — which makes them
 * the one injection surface in this file. Everything that reaches SQL as an identifier goes
 * through here first. This matters more than it used to: the agent's query tool lets a language
 * model choose field names, so "the caller is our own code" stopped being true.
 */
function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

/** `_sum: { amount: true }` -> `SUM("amount")::float8 AS "_sum__amount"`. */
function aggregateSelectParts(spec: {
  _count?: true | Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}): string[] {
  const parts: string[] = [];

  if (spec._count === true) {
    parts.push('COUNT(*)::int AS "_count"');
  } else if (spec._count) {
    for (const [field, on] of Object.entries(spec._count)) {
      // COUNT(col) counts non-nulls, which is exactly what Prisma's per-field count means.
      if (on) parts.push(`COUNT(${quoteIdent(field)})::int AS "_count__${field}"`);
    }
  }

  // Cast to float8 so the driver hands back a JS number: Postgres returns numeric as a string,
  // and an agent that reports "the total is '4200'" has quietly changed the answer's type.
  for (const [fn, key] of [['SUM', '_sum'], ['AVG', '_avg']] as const) {
    for (const [field, on] of Object.entries((spec as any)[key] ?? {})) {
      if (on) parts.push(`${fn}(${quoteIdent(field)})::float8 AS "${key}__${field}"`);
    }
  }

  // No cast: min/max are frequently dates or text, where float8 would fail outright.
  for (const [fn, key] of [['MIN', '_min'], ['MAX', '_max']] as const) {
    for (const [field, on] of Object.entries((spec as any)[key] ?? {})) {
      if (on) parts.push(`${fn}(${quoteIdent(field)}) AS "${key}__${field}"`);
    }
  }

  return parts;
}

/** Turns the flat `_sum__amount` columns back into Prisma's nested `{ _sum: { amount } }`. */
export function reshapeAggregateRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [column, value] of Object.entries(row ?? {})) {
    const split = column.indexOf('__');
    if (column.startsWith('_') && split > 0) {
      const key = column.slice(0, split);
      const field = column.slice(split + 2);
      (out[key] ??= {})[field] = value;
    } else {
      out[column] = value;
    }
  }
  return out;
}

export function buildGroupByQuery(
  table: string,
  args: {
    by: string[];
    where?: Record<string, any>;
    _count?: true | Record<string, boolean>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
    orderBy?: Record<string, any>;
    skip?: number;
    take?: number;
  },
): { sql: string; params: any[] } {
  const by = (args.by ?? []).map(quoteIdent);
  if (!by.length) throw new Error('groupBy requires at least one field in "by".');

  const aggregates = aggregateSelectParts(args);
  // A groupBy with no aggregate is a DISTINCT with extra steps; the caller almost certainly
  // wanted counts, and returning bare keys would look like data loss.
  const select = [...by, ...(aggregates.length ? aggregates : ['COUNT(*)::int AS "_count"'])];

  const params: any[] = [];
  let sql = `SELECT ${select.join(', ')} FROM ${quoteIdent(table)}`;

  if (args.where) {
    const { clause, values } = buildWhereClause(args.where, params.length);
    if (clause) {
      sql += ` WHERE ${clause}`;
      params.push(...values);
    }
  }

  sql += ` GROUP BY ${by.join(', ')}`;

  if (args.orderBy) {
    const [field, rawDirection] = Object.entries(args.orderBy)[0] ?? [];
    if (field) {
      const direction =
        (typeof rawDirection === 'string'
          ? rawDirection
          : Object.values(rawDirection ?? {})[0]) === 'desc'
          ? 'DESC'
          : 'ASC';
      // Ordering by the output alias covers both cases — a `by` column and `_count` — because
      // every one of them is named in the SELECT list above.
      sql += ` ORDER BY ${quoteIdent(field)} ${direction}`;
    }
  }

  if (args.take !== undefined) {
    params.push(args.take);
    sql += ` LIMIT $${params.length}`;
  }
  if (args.skip !== undefined) {
    params.push(args.skip);
    sql += ` OFFSET $${params.length}`;
  }

  return { sql, params };
}

export function buildAggregateQuery(
  table: string,
  args: {
    where?: Record<string, any>;
    _count?: true | Record<string, boolean>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
  },
): { sql: string; params: any[] } {
  const aggregates = aggregateSelectParts(args ?? {});
  const select = aggregates.length ? aggregates : ['COUNT(*)::int AS "_count"'];

  const params: any[] = [];
  let sql = `SELECT ${select.join(', ')} FROM ${quoteIdent(table)}`;

  if (args?.where) {
    const { clause, values } = buildWhereClause(args.where, params.length);
    if (clause) {
      sql += ` WHERE ${clause}`;
      params.push(...values);
    }
  }

  return { sql, params };
}

export function buildInsertQuery(
  table: string,
  data: Record<string, any>,
): { sql: string; params: any[] } {
  const keys = Object.keys(data);
  const params = keys.map((k) => coerceValue(data[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`);

  const sql = `INSERT INTO "${table}" (${keys.map(quoteIdent).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  return { sql, params };
}

export function buildUpdateQuery(
  table: string,
  where: Record<string, any>,
  data: Record<string, any>,
): { sql: string; params: any[] } {
  const dataKeys = Object.keys(data);
  const params: any[] = [];

  const setParts = dataKeys.map((key) => {
    params.push(coerceValue(data[key]));
    return `${quoteIdent(key)} = $${params.length}`;
  });

  let sql = `UPDATE "${table}" SET ${setParts.join(', ')}`;

  const { clause, values } = buildWhereClause(where, params.length);
  if (clause) {
    sql += ` WHERE ${clause}`;
    params.push(...values);
  }

  sql += ' RETURNING *';
  return { sql, params };
}

export function buildDeleteQuery(
  table: string,
  where: Record<string, any>,
): { sql: string; params: any[] } {
  const params: any[] = [];
  let sql = `DELETE FROM "${table}"`;

  const { clause, values } = buildWhereClause(where, params.length);
  if (clause) {
    sql += ` WHERE ${clause}`;
    params.push(...values);
  }

  sql += ' RETURNING *';
  return { sql, params };
}

/**
 * Builds WHERE clause from Prisma-like filter object.
 * Supports: equals, contains, startsWith, endsWith, gt, gte, lt, lte, not, mode, OR.
 */
function buildWhereClause(
  where: Record<string, any>,
  paramOffset: number,
): { clause: string; values: any[] } {
  const parts: string[] = [];
  const values: any[] = [];
  let idx = paramOffset;

  // Handle OR
  if (where.OR && Array.isArray(where.OR)) {
    const orParts: string[] = [];
    for (const orItem of where.OR) {
      const sub = buildWhereClause(orItem, idx);
      if (sub.clause) {
        orParts.push(`(${sub.clause})`);
        values.push(...sub.values);
        idx += sub.values.length;
      }
    }
    if (orParts.length > 0) {
      parts.push(`(${orParts.join(' OR ')})`);
    }
  }

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR') continue;

    if (val === null || val === undefined) {
      parts.push(`${quoteIdent(key)} IS NULL`);
      continue;
    }

    if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // Prisma-style operator object: { contains: "x", mode: "insensitive" }
      const isInsensitive = val.mode === 'insensitive';

      if (val.contains !== undefined) {
        idx++;
        values.push(`%${val.contains}%`);
        parts.push(isInsensitive
          ? `${quoteIdent(key)} ILIKE $${idx}`
          : `${quoteIdent(key)} LIKE $${idx}`);
      } else if (val.startsWith !== undefined) {
        idx++;
        values.push(`${val.startsWith}%`);
        parts.push(isInsensitive
          ? `${quoteIdent(key)} ILIKE $${idx}`
          : `${quoteIdent(key)} LIKE $${idx}`);
      } else if (val.endsWith !== undefined) {
        idx++;
        values.push(`%${val.endsWith}`);
        parts.push(isInsensitive
          ? `${quoteIdent(key)} ILIKE $${idx}`
          : `${quoteIdent(key)} LIKE $${idx}`);
      } else if (val.gt !== undefined) {
        idx++;
        values.push(coerceValue(val.gt));
        parts.push(`${quoteIdent(key)} > $${idx}`);
      } else if (val.gte !== undefined) {
        idx++;
        values.push(coerceValue(val.gte));
        parts.push(`${quoteIdent(key)} >= $${idx}`);
      } else if (val.lt !== undefined) {
        idx++;
        values.push(coerceValue(val.lt));
        parts.push(`${quoteIdent(key)} < $${idx}`);
      } else if (val.lte !== undefined) {
        idx++;
        values.push(coerceValue(val.lte));
        parts.push(`${quoteIdent(key)} <= $${idx}`);
      } else if (val.not !== undefined) {
        idx++;
        values.push(coerceValue(val.not));
        parts.push(`${quoteIdent(key)} != $${idx}`);
      }
    } else {
      // Simple equality
      idx++;
      values.push(coerceValue(val));
      parts.push(`${quoteIdent(key)} = $${idx}`);
    }
  }

  return { clause: parts.join(' AND '), values };
}

function coerceValue(val: any): any {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  return val;
}
