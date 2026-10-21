import type { PulseExecutor, PulseRepository } from '../../../core';

/**
 * Creates a login for someone and emails them an invitation to choose their own password.
 *
 * THE ONE RULE: the data never chooses its own privileges.
 * The role NAME comes from this node's config, the organisation from this node's config or the
 * run's own tenant, and the data written is a fixed whitelist — so a record carrying roleId,
 * organizationId or isPlatformAdmin cannot reach the database however a variable is set. What the
 * step reads from the run (email and names) is descriptive, never privileged.
 *
 * NO PASSWORD, EVER: the account is created without one and the person chooses it through a
 * single-use emailed link, so nothing a workflow holds — variables, step inputs, run history — is
 * ever a credential. (Public self sign-up, where a person types a password, is not a workflow: it
 * is a switch in Settings → Sign-in & Email, and the sign-up route hashes before it stores.)
 */

/** Only these fields are ever written. A whitelist, not a filter of what to drop. */
export const CREATE_USER_FIELDS = ['email', 'firstName', 'lastName', 'roleId', 'organizationId'] as const;

/** Keys never returned in the step's output, whatever the row happens to carry. */
const SECRET_KEYS = new Set(['password', 'passwordHash', 'hashedPassword', 'resetToken', 'otp']);

/** Permission maps are keyed by lower-cased entity name; these are the roles table's spellings. */
const ROLE_ENTITY_KEYS = ['rolesandpermissions', 'rolesandpermission', 'roles', 'role'];
const WRITE_ACTIONS = ['create', 'update', 'delete'];

/**
 * Would this role make the new account an administrator?
 *
 * Judged on what the role can DO, not on what it is called: "Member" can be widened on the Roles
 * page, and a role named "Team Lead" can be given the right to edit roles. The test is the right
 * to write the roles table — a role that can edit roles can grant itself everything else — plus
 * any platform/admin flag the row carries. Name matching is deliberately absent: it would refuse
 * a legitimate "Admin Assistant" and pass a wide-open "Guest".
 */
export function roleIsAdministrator(role: Record<string, unknown> | null | undefined): boolean {
  if (!role) return false;
  for (const flag of ['isPlatformAdmin', 'isAdmin', 'isSuperAdmin']) {
    if (role[flag] === true) return true;
  }
  const maps = [role.entityPermissions, role.permissions];
  for (const raw of maps) {
    if (!raw || typeof raw !== 'object') continue;
    const map = raw as Record<string, unknown>;
    for (const [entity, value] of Object.entries(map)) {
      if (!ROLE_ENTITY_KEYS.includes(entity.toLowerCase())) continue;
      if (!value || typeof value !== 'object') continue;
      const perms = value as Record<string, unknown>;
      if (WRITE_ACTIONS.some((action) => perms[action] === true)) return true;
      const actions = perms.actions;
      if (actions && typeof actions === 'object') {
        if (WRITE_ACTIONS.some((action) => (actions as Record<string, unknown>)[action] === true)) return true;
      }
    }
  }
  return false;
}

/** The created row as the workflow may see it: identity, never credentials. */
export function withoutSecrets(record: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record ?? {})) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/** The simple shape of an address: something, an @, a dotted domain. The mailbox proves the rest. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const execute: PulseExecutor = async (inputs, ctx) => {
  const roleName = text(inputs.role);
  if (!roleName) {
    return { error: { name: 'MissingRole', message: 'Create User Account must name the role to grant.' } };
  }

  const email = text(inputs.email).toLowerCase();
  if (!email) {
    return { error: { name: 'MissingEmail', message: 'Create User Account needs the email of the person the account is for.' } };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: { name: 'InvalidEmail', message: '"' + email + '" is not an email address.' } };
  }

  if (!ctx.services.invite) {
    // Said plainly BEFORE anything is written: an account created with no password and no invitation
    // is an account nobody can ever sign in to, which is worse than a failed step.
    return {
      error: {
        name: 'InviteNotAvailable',
        message: 'This runtime cannot send invitations, so the account was not created. Run the workflow in the app rather than in a test run.',
      },
    };
  }

  const userEntity = text(inputs.userEntity) || 'User';
  const roleEntity = text(inputs.roleEntity) || 'RolesAndPermissions';
  const roleNameField = text(inputs.roleNameField) || 'role';

  const roles: PulseRepository = ctx.services.repo(roleEntity);
  const role = await roles.findUnique({ [roleNameField]: roleName });
  if (!role) {
    return {
      error: {
        name: 'RoleNotFound',
        message: 'No role named "' + roleName + '" exists. Create it on the Roles and Permissions page first.',
      },
    };
  }
  if (roleIsAdministrator(role)) {
    return {
      error: {
        name: 'AdministratorRoleRefused',
        message: 'The role "' + roleName + '" can administer this app, so a workflow may not hand it out.',
      },
    };
  }

  const users: PulseRepository = ctx.services.repo(userEntity);
  const existing = await users.findUnique({ email });
  if (existing) {
    return { error: { name: 'EmailTaken', message: 'An account with that email already exists.' } };
  }

  const organizationId =
    inputs.organizationId === undefined || inputs.organizationId === null || text(inputs.organizationId) === ''
      ? ctx.run.organizationId
      : Number(inputs.organizationId);

  // The password column is simply not written: User.password is nullable, and NULL is exactly what
  // "has not chosen one yet" means. Sign-in refuses such an account with its own message, and the
  // Users page lists it as pending.
  const data: Record<string, unknown> = { email, roleId: (role as any).id };
  const firstName = text(inputs.firstName);
  const lastName = text(inputs.lastName);
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (organizationId !== undefined && organizationId !== null && Number.isFinite(Number(organizationId))) {
    data.organizationId = Number(organizationId);
  }

  const created = await users.create(data);

  // After the row exists, so a failed send leaves an account an administrator can invite again
  // from the Users page rather than losing the whole step. The token never enters the run.
  const result = await ctx.services.invite({ userId: (created as any).id, email });
  return { outputs: { user: withoutSecrets(created), invited: Boolean(result?.sent) } };
};
