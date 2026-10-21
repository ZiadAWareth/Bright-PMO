import type { PulseRepository, PulseServices, PulseContext } from './pulse.contract';
import { aggregateRows, groupRows, type AggregateArgs, type GroupByArgs } from './aggregate';

/** Shallow equality match of a row against a `where` filter (equality only —
 *  enough for the in-memory test repo). */
function matches(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  return Object.entries(where ?? {}).every(([k, v]) => row[k] === v);
}

/**
 * In-memory PulseRepository for DB-free unit tests. Auto-increments a numeric
 * `id` on create; supports simple equality `where`, single-key `orderBy`, and
 * `skip`/`take` pagination.
 */
export function memoryRepo(initial: Array<Record<string, unknown>> = []) {
  const rows: Array<Record<string, unknown>> = initial.map((r) => ({ ...r }));
  let autoId = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);

  const repo: PulseRepository = {
    async create(data) {
      const rec = { id: ++autoId, ...data };
      rows.push(rec);
      return { ...rec };
    },
    async findUnique(where) {
      return rows.find((r) => matches(r, where)) ?? null;
    },
    async findMany(args) {
      const a = args as { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'>; skip?: number; take?: number };
      let out = rows.filter((r) => matches(r, a.where));
      if (a.orderBy) {
        const [field, dir] = Object.entries(a.orderBy)[0];
        out = [...out].sort((x, y) => {
          const xv = x[field] as string | number;
          const yv = y[field] as string | number;
          const cmp = xv > yv ? 1 : xv < yv ? -1 : 0;
          return cmp * (dir === 'desc' ? -1 : 1);
        });
      }
      if (a.skip) out = out.slice(a.skip);
      if (a.take != null) out = out.slice(0, a.take);
      return out.map((r) => ({ ...r }));
    },
    async count(args) {
      const a = args as { where?: Record<string, unknown> };
      return rows.filter((r) => matches(r, a?.where)).length;
    },
    async update(where, data) {
      const r = rows.find((x) => matches(x, where));
      if (!r) throw new Error('Record not found');
      Object.assign(r, data);
      return { ...r };
    },
    async delete(where) {
      const i = rows.findIndex((x) => matches(x, where));
      if (i < 0) throw new Error('Record not found');
      const [r] = rows.splice(i, 1);
      return r;
    },
    async groupBy(args) {
      const a = args as GroupByArgs;
      return groupRows(rows.filter((r) => matches(r, a.where)), a);
    },
    async aggregate(args) {
      const a = args as AggregateArgs;
      return aggregateRows(rows.filter((r) => matches(r, a?.where)), a ?? {});
    },
  };
  return { repo, rows: () => rows };
}

/** Full PulseServices stub with sensible in-memory defaults; override per test. */
export function stubServices(overrides: Partial<PulseServices> = {}): PulseServices {
  return {
    repo: () => {
      throw new Error('no repo configured for this test');
    },
    log: () => undefined,
    ...overrides,
  };
}

/** Full PulseContext stub. */
export function stubContext(partial: Partial<PulseContext> = {}): PulseContext {
  return {
    variables: {},
    scopeId: 'scope:root',
    services: stubServices(),
    run: { id: 'r', workflowId: 'wf' },
    isTest: true,
    ...partial,
  };
}
