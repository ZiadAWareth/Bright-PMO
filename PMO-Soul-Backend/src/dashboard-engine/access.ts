/**
 * Who may do what with Dynamic Dashboards. A plain module so every rule can be tested on its own.
 *
 * Two levels, on purpose:
 *   - the APP'S connection to the Dashboard Engine belongs to the app owner (the Super Admin, the
 *     platform administrator): one connection, one key pair, made once;
 *   - each ORGANIZATION decides whether it uses dashboards at all. Who may flip that switch depends
 *     on the owner's policy:
 *       self_service — each organization's administrator turns it on or off for their organization;
 *       owner_only   — only the owner decides; an organization's administrator can ask;
 *       automatic    — on for every organization; the owner can still turn one off, and may lock
 *                      organizations out of turning themselves off.
 *
 * Which dashboard and which widget a person then sees is decided by the Dashboard Engine's own
 * permissions. This module only decides who reaches the Dynamic Dashboards area at all.
 */

export type OrgPolicy = 'self_service' | 'owner_only' | 'automatic';
export const ORG_POLICIES: OrgPolicy[] = ['self_service', 'owner_only', 'automatic'];

export type OrgStatus = 'active' | 'inactive' | 'requested';

export interface Actor {
  /** The app owner (Super Admin / platform administrator). */
  isOwner: boolean;
  /** The caller's organization; null for the owner, who acts across organizations. */
  organizationId: number | null;
  /** Role has the "Manage dynamic dashboards" switch. */
  canManage: boolean;
  /** Role has the "Dynamic dashboards" switch. */
  canView: boolean;
}

export interface Decision {
  ok: boolean;
  reason?: string;
}

const yes: Decision = { ok: true };
const no = (reason: string): Decision => ({ ok: false, reason });

export function isPolicy(value: unknown): value is OrgPolicy {
  return typeof value === 'string' && (ORG_POLICIES as string[]).includes(value);
}

/** Does this organization use dashboards right now? */
export function orgEnabled(policy: OrgPolicy, status: OrgStatus | null | undefined): boolean {
  if (policy === 'automatic') return status !== 'inactive';
  return status === 'active';
}

/** May this person turn dashboards on (enable=true) or off for this organization? */
export function canSetOrg(
  actor: Actor,
  orgId: number,
  enable: boolean,
  policy: OrgPolicy,
  lockOptOut: boolean,
): Decision {
  if (!Number.isInteger(orgId) || orgId <= 0) return no('Choose an organization.');
  if (actor.isOwner) return yes;
  if (!actor.canManage) return no('Your role cannot change dashboard settings.');
  if (actor.organizationId !== orgId) return no('You can only change dashboards for your own organization.');
  if (policy === 'owner_only') {
    return no('The app owner decides which organizations use dashboards. Ask them to turn it on.');
  }
  if (policy === 'automatic' && !enable && lockOptOut) {
    return no('The app owner has turned dashboards on for every organization.');
  }
  return yes;
}

/** May this person ask the owner to turn dashboards on for their organization? */
export function canRequestOrg(actor: Actor, orgId: number, policy: OrgPolicy): Decision {
  if (actor.isOwner) return no('You can turn it on directly.');
  if (!actor.canManage || actor.organizationId !== orgId) return no('Only your organization\'s administrator can ask for this.');
  if (policy !== 'owner_only') return no('You can turn it on yourself.');
  return yes;
}

/**
 * May this person add, change or remove an entry in the app's dashboard list?
 * `rowOrgId` null means the entry is shown to every organization, which only the owner manages.
 */
export function canManageEntry(actor: Actor, rowOrgId: number | null): Decision {
  if (actor.isOwner) return yes;
  if (!actor.canManage) return no('Your role cannot change the dashboard list.');
  if (rowOrgId === null) return no('Only the app owner can change dashboards shown to every organization.');
  if (actor.organizationId !== rowOrgId) return no('You can only change your own organization\'s dashboards.');
  return yes;
}

/** Which organization a NEW entry belongs to, from what the person asked for. */
export function targetOrgForNewEntry(actor: Actor, requested: unknown): { orgId: number | null } | Decision {
  if (actor.isOwner) {
    if (requested === null || requested === undefined || requested === '' || requested === 'all') return { orgId: null };
    const n = Number(requested);
    return Number.isInteger(n) && n > 0 ? { orgId: n } : no('Choose an organization, or "All organizations".');
  }
  if (!actor.canManage) return no('Your role cannot change the dashboard list.');
  if (actor.organizationId === null || actor.organizationId <= 0) return no('Your account is not in an organization.');
  // An organization's administrator always adds for their own organization, whatever was sent.
  return { orgId: actor.organizationId };
}

/** Entries this person may open: their organization's and the ones shown to everyone. */
export function visibleEntries<T extends { organizationId: number | null }>(actor: Actor, rows: T[]): T[] {
  if (actor.isOwner) return rows;
  return rows.filter((r) => r.organizationId === null || r.organizationId === actor.organizationId);
}
