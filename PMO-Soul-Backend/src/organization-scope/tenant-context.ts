import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request tenant context, carried via AsyncLocalStorage so the singleton
 * PrismaService can scope every query without any service call-site changes.
 *
 * Ownership sentinel: records with organizationId === PLATFORM_ORG are
 * platform-owned (shared across all tenants, editable only by platform admins).
 * Numeric (0) because organization ids are Int autoincrement (which start at 1),
 * so 0 can never collide with a real tenant.
 */
export const PLATFORM_ORG = 0;

export interface TenantContext {
  /** The tenant (organizationId) of the current principal. */
  organizationId?: number;
  /** Platform admin — bypasses all tenant scoping (sees every tenant + platform). */
  isPlatformAdmin?: boolean;
  /** Trusted internal execution (seeds, migrations) — bypasses scoping. */
  system?: boolean;
  /** Authenticated user id (as string) — stamped onto audit-log entries. */
  userId?: string;
  /** Authenticated user email — convenience for audit attribution. */
  userEmail?: string;
}

const als = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return als.getStore();
}

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Run trusted internal work with scoping disabled (background jobs, seeds). */
export function runAsSystem<T>(fn: () => T): T {
  return als.run({ system: true }, fn);
}
