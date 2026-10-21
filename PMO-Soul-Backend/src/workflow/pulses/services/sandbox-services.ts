import {
  type PulseServices,
  type PulseRepository,
  type PulseAgentRequest,
  aggregateRows,
  groupRows,
  type AggregateArgs,
  type GroupByArgs,
} from '../core';

/**
 * PulseServices for DESIGNER TEST RUNS — real reads, simulated writes.
 *
 * A test is only useful if it runs against the SAME data and the SAME config
 * inputs the workflow will use in production. So reads (`findUnique` / `findMany`
 * / `count`) fall through to the real, tenant-scoped database via `realRead`,
 * and every executor is driven by its real modal config — no fabricated rows.
 *
 * What stays simulated is only the *irreversible* part: writes (create / update /
 * delete) go to a per-run in-memory overlay layered on top of the real reads
 * (copy-on-write), and email / notification / HTTP are captured, not performed.
 * So a test never mutates production data or fires a real side effect, yet a step
 * that creates a record and a later step that reads it back still see a coherent
 * world.
 *
 * `realRead` is optional: without it (pure unit tests) the repo is fully
 * in-memory, seeded from `seed` — the original behaviour.
 */
export interface RealReader {
  findFirst(where: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  count(args: Record<string, unknown>): Promise<number>;
}

function matches(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  // Exact-equality match for the in-memory overlay. Real Prisma handles operator
  // filters ({ gt: … }) itself; the overlay only needs simple equality, which is
  // what a workflow's created/updated rows are looked up by ({ id }).
  return Object.entries(where ?? {}).every(([k, v]) => row[k] === v);
}

const idKey = (row: Record<string, unknown>): string => String(row?.id);

export function sandboxServices(
  seed: Record<string, Array<Record<string, unknown>>> = {},
  realRead?: (entity: string) => RealReader,
) {
  // Per-entity overlay: rows created during the run, field patches applied to
  // real/created rows, and ids deleted during the run. Real data is never touched.
  const created: Record<string, Array<Record<string, unknown>>> = {};
  for (const [entity, rows] of Object.entries(seed)) created[entity] = rows.map((r) => ({ ...r }));
  const patches: Record<string, Map<string, Record<string, unknown>>> = {};
  const deleted: Record<string, Set<string>> = {};
  const logs: Array<{ level: string; message: string }> = [];
  // Synthetic ids for created rows start high so they never collide with real
  // ids, and created rows are consulted before the real DB on read-back anyway.
  let synthId = 1_000_000_000;

  const overlay = (entity: string) => (created[entity] ??= []);
  const patchMap = (entity: string) => (patches[entity] ??= new Map());
  const deletedSet = (entity: string) => (deleted[entity] ??= new Set());

  const applyPatch = (entity: string, row: Record<string, unknown>): Record<string, unknown> => {
    const p = patchMap(entity).get(idKey(row));
    return p ? { ...row, ...p } : { ...row };
  };

  const repo = (entity: string): PulseRepository => {
    const reader = realRead?.(entity);
    const del = deletedSet(entity);

    // Merged read (real rows + overlay), used by both findMany and count — kept as
    // a closure so it never depends on `this` (executors may unbind repo methods).
    const mergedRead = async (args: Record<string, unknown> | undefined) => {
      const a = (args ?? {}) as { where?: Record<string, unknown> };
      const realRows = reader ? await reader.findMany(args ?? {}) : [];
      const seen = new Set<string>();
      const out: Array<Record<string, unknown>> = [];
      for (const r of realRows) {
        const k = idKey(r);
        if (del.has(k)) continue;
        seen.add(k);
        out.push(applyPatch(entity, r));
      }
      // Rows created this run that match the filter and aren't already present.
      for (const r of overlay(entity)) {
        const k = idKey(r);
        if (del.has(k) || seen.has(k)) continue;
        if (matches(r, a.where)) out.push(applyPatch(entity, r));
      }
      return out;
    };

    return {
      async create(data) {
        const rec = { id: ++synthId, ...data };
        overlay(entity).push(rec);
        return { ...rec };
      },

      async findUnique(where) {
        // Overlay (created this run) first, then the real database.
        const local = overlay(entity).find((r) => matches(r, where));
        if (local) return del.has(idKey(local)) ? null : applyPatch(entity, local);
        const real = reader ? await reader.findFirst(where) : null;
        if (!real) return null;
        return del.has(idKey(real)) ? null : applyPatch(entity, real);
      },

      async findMany(args) {
        const a = (args ?? {}) as { skip?: number; take?: number };
        let out = await mergedRead(args);
        if (a.skip) out = out.slice(a.skip);
        if (a.take != null) out = out.slice(0, a.take);
        return out;
      },

      async count(args) {
        return (await mergedRead(args)).length;
      },

      async update(where, data) {
        const local = overlay(entity).find((r) => matches(r, where) && !del.has(idKey(r)));
        const target = local ?? (reader ? await reader.findFirst(where) : null);
        if (!target || del.has(idKey(target))) throw new Error('Record not found');
        // Copy-on-write: record the patch; never write to the real database.
        const prev = patchMap(entity).get(idKey(target)) ?? {};
        const next = { ...prev, ...data };
        patchMap(entity).set(idKey(target), next);
        return { ...target, ...next };
      },

      async delete(where) {
        const local = overlay(entity).find((r) => matches(r, where) && !del.has(idKey(r)));
        const target = local ?? (reader ? await reader.findFirst(where) : null);
        if (!target || del.has(idKey(target))) throw new Error('Record not found');
        del.add(idKey(target));
        return applyPatch(entity, target);
      },

      // Grouped over the SAME merged view as findMany, so a test that creates a row and then
      // counts by status sees its own write. Aggregating in the database instead would silently
      // skip the overlay and report the pre-run numbers.
      async groupBy(args) {
        const a = (args ?? {}) as GroupByArgs;
        return groupRows(await mergedRead(args), a);
      },

      async aggregate(args) {
        const a = (args ?? {}) as AggregateArgs;
        return aggregateRows(await mergedRead(args), a);
      },
    };
  };

  const emails: unknown[] = [];
  const notifications: unknown[] = [];
  const agentCalls: PulseAgentRequest[] = [];

  const services: PulseServices = {
    repo,
    log: (level, message) => logs.push({ level, message }),
    http: async (req) => ({ status: 200, data: { mock: true, method: req.method, url: req.url } }),
    // A test run never reaches the company's Oracle or Gmail: the step answers with what it WOULD run.
    connector: async (req) => ({ mock: true, connector: req.connector, action: req.action, props: Object.keys(req.props || {}) }),
    // Captured, never run. Unlike a mocked HTTP call this one would cost real money on a real
    // provider, and a unit test that quietly spends is a test nobody runs twice. `result` is
    // undefined rather than a plausible object on purpose: a test asserting on a fabricated
    // answer would be asserting on this stub, not on the workflow.
    agent: async (req) => {
      agentCalls.push(req);
      return {
        answer: `(sandbox) agent "${req.agentName ?? req.agentId ?? 'unnamed'}" was not run.`,
        toolsUsed: [],
      };
    },
    sendEmail: async (email) => {
      // Sandbox transport: the mail is captured, not delivered. Reported as such
      // so a test run cannot look like a real send (G5).
      emails.push(email);
      return { sent: false, via: 'sandbox' };
    },
    notify: async (n) => {
      notifications.push(n);
    },
  };

  return { services, logs, emails, notifications, agentCalls };
}
