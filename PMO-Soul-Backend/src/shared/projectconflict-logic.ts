/**
 * ProjectConflictLogic — framework-agnostic business logic for ProjectConflict.
 *
 * This module contains ALL business rules: search, filter, sort, paginate,
 * password hashing, JSON parsing, formula evaluation, unique constraint handling,
 * and lifecycle hook dispatch.
 *
 * Used by:
 *   Production: NestJS ProjectConflictService wraps this with PrismaRepository + real hooks
 *   Preview:    Web Worker wraps this with PGliteRepository + sync internal hooks
 */
// `import type` for the two interfaces, not a value import. They exist only in the type system, so
// a value import makes this module unloadable outside a bundler — which is exactly how the test
// runner loads it to exercise aggregate() against a fake repository. tsc stays green either way,
// so the value form hid the problem.
import type { Repository } from './repository';
import type { EntityLifecycleHooks } from './hooks';
import { buildUpdateEventPayload } from './entity-event-payload';
import type { EntityFilterSpec } from './query-filters';
import { buildWhereFromFilters } from './query-filters';
import type { AggregateRequest, AggregateResponse } from './aggregate';
import { aggregateSelect, buildAggregateResponse, planAggregate } from './aggregate';

/**
 * Page size bounds (scalability-plan §1.3).
 *
 * These are enforced here, in the framework-agnostic logic, rather than in the controller, so the
 * NestJS server and the PGlite preview worker cannot disagree about them — and so a new transport
 * (a second controller, an internal caller) cannot bypass the cap by forgetting to validate.
 */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * This model's columns, classified. Read by the shared filter parser (the list endpoint) and by the
 * aggregate planner, so both agree on which columns exist and how a wire value becomes a column
 * value. Exported so the aggregate endpoint's rules can be checked directly in a test.
 *
 * Relation fields are deliberately absent: they are not columns, and neither a filter nor a fold
 * can be applied to one. Formula fields are absent for the same reason — they are computed after
 * the read, so the database has nothing to total.
 */
export const FILTER_SPEC: EntityFilterSpec = {
  fields: ["id","projectId","type","severity","description","affectedWorkItemIds","affectedResourceIds","suggestedResolution","resolvedAt","createdAt","organizationId"],
  stringFields: ["description","suggestedResolution"],
  numberFields: ["id","projectId","affectedWorkItemIds","affectedResourceIds","organizationId"],
  intFields: ["id","projectId","affectedWorkItemIds","affectedResourceIds","organizationId"],
  bigintFields: [],
  dateFields: ["resolvedAt","createdAt"],
  listFields: ["affectedWorkItemIds","affectedResourceIds"],
};

export class ProjectConflictLogic {
  

  constructor(
    private repo: Repository,
    private hooks: EntityLifecycleHooks,
  ) {}

  async getAll(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
    filters?: any;
  }) {
    const {
      page: rawPage,
      limit: rawLimit,
      sortBy,
      sortOrder = 'asc',
      q,
      filters = {},
    } = params || {};

    // Clamped, not trusted. `?limit=1000000` used to return 200 OK and would happily try to
    // load and serialise every row in the table — one request, from any signed-in user, enough
    // to exhaust the container's memory. `?limit=-1` reached Prisma too, where a negative
    // `take` means "walk backwards" rather than "invalid".
    // Anything non-numeric, zero or negative falls back to the default instead of being passed on.
    const requestedLimit = Math.trunc(Number(rawLimit));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    const requestedPage = Math.trunc(Number(rawPage));
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 0;

    const where: any = {};

    // Full-text search across string fields
    if (q && q.trim()) {
      const searchTerm = q.trim();
      const searchFields: string[] = ["description","suggestedResolution"];
      if (searchFields.length > 0) {
        where.OR = searchFields.map((field: string) => ({
          [field]: { contains: searchTerm, mode: 'insensitive' },
        }));
      }
    }

    // Field-specific filters, parsed by the app's ONE filter parser (shared/query-filters.ts).
    // It used to be an inline copy here; the aggregate endpoint has to filter the same rows the
    // same way, and two parsers means two answers to "what does gte mean on a Decimal column".
    buildWhereFromFilters(filters, FILTER_SPEC, where);


    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.id = 'asc';
    }

    const total = await this.repo.count({ where });
    const data = await this.repo.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
    });

    return {
      data: data,
      total,
      // The page size actually used, which is not always the one asked for. Without this a
      // caller that requested 1000 and received 100 would divide `total` by 1000 and conclude
      // there was nothing on page two. Additive, so existing clients are unaffected.
      page,
      limit,
    };
  }

  /**
   * One number for a dashboard card: the total, average, smallest, largest, or count.
   *
   * Why this exists at all: a metric card had nothing to call. The list endpoint already answers
   * "how many" (it returns a real count(where)), so a builder could wire counts and nothing else —
   * every "total revenue" on a designed page was invented text.
   *
   * Tenant isolation is NOT re-implemented here. repo.aggregate() reaches Prisma through the same
   * scoping middleware as the count() the list endpoint runs, and 'aggregate' is one of its
   * READ_ACTIONS, so the tenant filter is merged into the where before the fold happens. Adding a
   * second organisationId check here would be the pattern the middleware exists to remove.
   */
  async aggregate(request: AggregateRequest): Promise<AggregateResponse> {
    const plan = planAggregate('ProjectConflict', request, FILTER_SPEC);
    const raw = await this.repo.aggregate({ where: plan.where, ...aggregateSelect(plan) });
    return buildAggregateResponse('ProjectConflict', plan, raw);
  }

  async getById(id: number) {
    const record = await this.repo.findUnique({ where: { id } });
    return record;
  }

  async create(dto: any, userId?: number, applicationId?: string) {
    const createData: any = { ...dto };
    const data = createData;
    // Wire → Prisma: BigInt arrives as digits (string or number), Bytes as base64.
    for (const f of []) {
      if (data[f] === undefined || data[f] === null) continue;
      data[f] = Array.isArray(data[f]) ? data[f].map((v: any) => BigInt(v)) : BigInt(data[f]);
    }
    for (const f of []) {
      if (data[f] === undefined || data[f] === null) continue;
      data[f] = Array.isArray(data[f]) ? data[f].map((v: any) => Buffer.from(String(v), 'base64')) : Buffer.from(String(data[f]), 'base64');
    }


    try {
      const result = await this.repo.create({ data: createData });


      // Internal hook: trigger in-app workflows (runs synchronously in preview)
      try {
        this.hooks.internal.onEntityEvent?.('ProjectConflict', 'onCreate', result);
      } catch (_) { /* fire-and-forget */ }

      return result;
    } catch (error: any) {
      // Handle unique constraint violations (P2002)
      if (error.code === 'P2002' && error.meta?.target) {
        const uniqueFields = error.meta.target as string[];
        const whereClause: any = {};
        for (const field of uniqueFields) {
          if (createData[field] !== undefined && createData[field] !== null) {
            whereClause[field] = createData[field];
          }
        }
        if (Object.keys(whereClause).length > 0) {
          const existing = await this.repo.findFirst({ where: whereClause });
          if (existing) return existing;
        }
      }
      throw error;
    }
  }

  async update(id: number, dto: any, userId?: number, applicationId?: string) {
    const updateData: any = { ...dto };
    const data = updateData;
    // Wire → Prisma: BigInt arrives as digits (string or number), Bytes as base64.
    for (const f of []) {
      if (data[f] === undefined || data[f] === null) continue;
      data[f] = Array.isArray(data[f]) ? data[f].map((v: any) => BigInt(v)) : BigInt(data[f]);
    }
    for (const f of []) {
      if (data[f] === undefined || data[f] === null) continue;
      data[f] = Array.isArray(data[f]) ? data[f].map((v: any) => Buffer.from(String(v), 'base64')) : Buffer.from(String(data[f]), 'base64');
    }



    // The row BEFORE the write: the update event carries which fields changed (G16), which is
    // what a trigger's watchFields and the 'changed' operator match on. Without it every
    // watchFields trigger was silently dead.
    const previous = await this.repo.findUnique({ where: { id } });
    const result = await this.repo.update({
      where: { id },
      data: updateData,
    });


    // Internal hook
    try {
      this.hooks.internal.onEntityEvent?.('ProjectConflict', 'onUpdate', buildUpdateEventPayload(previous as any, result as any));
    } catch (_) { /* fire-and-forget */ }

    return result;
  }

  async remove(id: number, applicationId?: string) {
    const deletedRecord = await this.repo.findUnique({ where: { id } });
    const result = await this.repo.delete({ where: { id } });


    // Internal hook
    try {
      this.hooks.internal.onEntityEvent?.('ProjectConflict', 'onDelete', result);
    } catch (_) { /* fire-and-forget */ }

    return result;
  }
}
