/**
 * Which roles may open which screens.
 *
 * This is the single source of truth for route permissions. Both the sidebar
 * (which decides what to show) and the page guard (which decides what to serve)
 * read from here, so a screen can never be advertised in the nav to someone who
 * would be bounced on arrival — that mismatch is exactly what happened when the
 * two lists were maintained separately.
 *
 * Roles are the `name` values seeded in `prisma/seed.ts`: PJM, PMO, FIN, PROC,
 * ENG, SITE, QAQC, IT, DIR, HR, LEGAL, SYSTEM (plus ADMIN).
 *
 * A route absent from this map has no role restriction — any signed-in user may
 * open it. That is deliberate for personal screens such as the timesheet, where
 * every employee logs their own hours and the in-page checks (for example
 * `canViewAllTimesheets`) handle the narrower "see everyone's data" case.
 */
export const ROUTE_ROLES: Record<string, string[]> = {
  "/analytics/dashboard": [
    "PMO",
    "PJM",
    "ADMIN",
    "FIN",
    "QAQC",
    "IT",
    "DIR",
    "HR",
    "LEGAL",
  ],
  "/analytics/reporting-engine": [
    "PJM",
    "PMO",
    "ADMIN",
    "FIN",
    "QAQC",
    "IT",
    "DIR",
  ],
  "/analytics/reports": ["PJM", "PMO", "ADMIN", "FIN", "QAQC", "IT", "DIR"],
  "/eps": ["PJM", "PMO", "ADMIN", "FIN", "DIR"],
  "/portfolios": ["PMO", "PJM", "ADMIN", "IT", "DIR"],
  "/projects": ["PJM", "PMO", "ADMIN", "QAQC", "DIR"],
  "/resources": ["PJM", "PMO", "ADMIN", "DIR", "HR"],
  "/users": ["PMO", "ADMIN", "HR", "DIR"],
  "/risk": ["PJM", "PMO", "ADMIN", "DIR"],
  /** PROC owns procurement; PJM/PMO run the work and DIR oversees it. */
  "/rfq-management": ["PROC", "PJM", "PMO", "ADMIN", "DIR"],
  /** Mirrors the page's own `canManageSchedules`, so gate and controls agree. */
  "/scheduler": ["PMO", "PJM", "ADMIN", "DIR"],
  /**
   * Administrative tooling. These reach past the feature screens: the generic
   * entity browser reads and writes any table in `lib/entities.ts`, the Swagger
   * page publishes the whole API surface, and the report generator queries
   * across modules. None of them scope output to the caller, so ADMIN only.
   */
  "/admin": ["ADMIN"],
  "/api-docs": ["ADMIN"],
  "/report-generator": ["ADMIN"],
  /** Role-switcher landing page; same audience as the dashboard it links to. */
  "/analytics": ["PMO", "PJM", "ADMIN", "FIN", "QAQC", "IT", "DIR", "HR", "LEGAL"],
  /** Per-user drilldown — the same audience that may open User Management. */
  "/analytics/users": ["PMO", "ADMIN", "HR", "DIR"],
  "/dynamic-dashboard": ["PMO", "PJM", "ADMIN", "FIN", "QAQC", "IT", "DIR"],
};

/**
 * Does `role` grant access to `route`?
 *
 * Comparison is case-insensitive because the role reaches us from three places
 * that disagree on casing: the JWT claim, the `x-user-role` header (uppercased
 * by middleware) and the Prisma `role.name` relation.
 */
export function canAccessRoute(
  route: string,
  role: string | null | undefined,
): boolean {
  const allowed = ROUTE_ROLES[route];
  if (!allowed || allowed.length === 0) return true;
  if (!role) return false;
  return allowed.some((r) => r.toLowerCase() === role.toLowerCase());
}

/**
 * The permission entry governing a pathname, matching the longest route prefix.
 *
 * Child routes inherit their parent's rule (`/projects/12/gantt` is governed by
 * `/projects`), and the longest match wins so a more specific entry can still
 * override a broader one later.
 */
export function rolesForPathname(pathname: string): string[] | undefined {
  let best: string | undefined;
  for (const route of Object.keys(ROUTE_ROLES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      if (!best || route.length > best.length) best = route;
    }
  }
  return best ? ROUTE_ROLES[best] : undefined;
}

/**
 * The registered route key governing a pathname, or `undefined` when none does.
 *
 * `rolesForPathname` answers *which roles*; this answers *which rule matched*,
 * which the layout guard needs so it can pass a stable `route` to
 * `canAccessRoute` and label the denial screen. Same longest-prefix rule, so
 * `/projects/12/budget` resolves to `/projects` and `/analytics/users` beats the
 * broader `/analytics`.
 */
export function matchRoute(pathname: string): string | undefined {
  let best: string | undefined;
  for (const route of Object.keys(ROUTE_ROLES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      if (!best || route.length > best.length) best = route;
    }
  }
  return best;
}

/**
 * Human label for a route, used as the header on the denial screen so the shell
 * still looks intact rather than showing a bare error on a blank page.
 */
export const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Admin",
  "/analytics": "Analytics",
  "/analytics/dashboard": "Dashboard",
  "/analytics/reporting-engine": "Reporting Engine",
  "/analytics/reports": "Reports",
  "/analytics/users": "User Analytics",
  "/api-docs": "API Documentation",
  "/dynamic-dashboard": "Dynamic Dashboard",
  "/eps": "Enterprise Project Structure",
  "/portfolios": "Portfolios",
  "/projects": "Projects",
  "/report-generator": "Report Generator",
  "/resources": "Resources",
  "/rfq-management": "RFQ Management",
  "/risk": "Risk Management",
  "/scheduler": "Project Scheduler",
  "/users": "User Management",
};
