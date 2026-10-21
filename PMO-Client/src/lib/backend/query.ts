/**
 * Soul's list conventions, in one place.
 *
 * `GET /backend/<entity>?page=0&limit=10&sortBy=name&sortOrder=asc&q=text&status=active&budgetCapacity_gte=1000`
 * returns `{ data, total }`. Pages are 0-based and at most 100 rows long.
 */

export interface BackendList<T> {
  data: T[];
  total: number;
}

/** Soul's filter operators. A filter with no operator means `equals`. */
export type FilterOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "ne";

type FilterValue = string | number | boolean | Date;

/**
 * `{ status: "active" }` or `{ budgetCapacity: { gte: 1000 } }`.
 * Only one operator per field takes effect: Soul applies the last one
 * (SOUL-ISSUES.md, issue 14), so a range needs a custom endpoint for now.
 */
export type ListFilters = Record<
  string,
  FilterValue | Partial<Record<FilterOperator, FilterValue>> | null | undefined
>;

export interface ListOptions {
  /** 1-based, as shown in the UI. */
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  /**
   * Soul's `q` text search. It fails (500) on entities with a list column
   * (Portfolio, Project, WorkItem, Resource; SOUL-ISSUES.md, issue 15): use a
   * `{ name: { contains } }` filter there until Soul fixes it.
   */
  search?: string;
  filters?: ListFilters;
}

export const MAX_PAGE_SIZE = 100;

function wire(value: FilterValue): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Query-string parameters for a Soul list endpoint. */
export function listParams(options: ListOptions = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, (options.page ?? 1) - 1)));
  params.set("limit", String(Math.min(options.pageSize ?? 10, MAX_PAGE_SIZE)));
  if (options.sortBy) {
    params.set("sortBy", options.sortBy);
    params.set("sortOrder", options.sortOrder ?? "asc");
  }
  if (options.search?.trim()) params.set("q", options.search.trim());

  for (const [field, filter] of Object.entries(options.filters ?? {})) {
    if (filter === null || filter === undefined || filter === "") continue;
    if (typeof filter === "object" && !(filter instanceof Date)) {
      for (const [op, value] of Object.entries(filter)) {
        if (value === undefined || value === null || value === "") continue;
        params.set(op === "equals" ? field : `${field}_${op}`, wire(value));
      }
    } else {
      params.set(field, wire(filter));
    }
  }
  return params;
}

/** Soul sends `Decimal` columns as strings ("1500000.5"). */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
