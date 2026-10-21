import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

/**
 * WHY `identity.` AND NOT `data.`
 * The type is namespaced away from the generic data pulses on purpose: this is the ONLY step that
 * may create a login, and the namespace says so wherever the type appears (run history, a graph
 * export, a log line). The CATEGORY is 'data' because that is where a designer looks for "create
 * something" in the palette, and the palette's categories are a fixed, ordered list — a new one
 * would render untitled. The folder sits under catalog/data for the same reason.
 *
 * WHO IT IS FOR: a process that creates an account for SOMEBODY ELSE — an approved application, an
 * HR import, a new client. The person chooses their own password through a single-use emailed
 * link, so no password is ever typed, templated or stored by the workflow. (Public self sign-up is
 * not a workflow: it is a switch in Settings → Sign-in & Email.)
 */
export const meta: PulseMeta = {
  type: 'identity.createUser',
  category: 'data',
  label: 'Create User Account',
  description: 'Creates a login for someone, with the role this step names, and emails them an invitation to choose a password.',
  icon: 'user-plus',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'email',
    label: 'Email',
    type: 'string',
    required: true,
    help: 'Who the account is for, e.g. {{record.email}}. The invitation goes to this address.',
  },
  { key: 'firstName', label: 'First name', type: 'string', help: 'e.g. {{record.firstName}}' },
  { key: 'lastName', label: 'Last name', type: 'string', help: 'e.g. {{record.lastName}}' },
  {
    key: 'role',
    label: 'Role to grant',
    type: 'string',
    required: true,
    help: 'The NAME of the role, e.g. Member. Decided here, never by the data the step reads. A role that can edit roles is refused.',
  },
  {
    key: 'organizationId',
    label: 'Organisation',
    type: 'number',
    help: 'Which organisation the account belongs to. Leave blank to use the workflow\'s own organisation.',
  },
  {
    key: 'userEntity',
    label: 'User entity',
    type: 'entity',
    default: 'User',
    help: 'The model that holds logins. Change it only if this app names it something else.',
  },
  {
    key: 'roleEntity',
    label: 'Role entity',
    type: 'entity',
    default: 'RolesAndPermissions',
    help: 'The model that holds roles.',
  },
  {
    key: 'roleNameField',
    label: 'Role name field',
    type: 'string',
    default: 'role',
    help: 'The column holding the role name on the role model.',
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'email', label: 'Who the account is for' }],
  outputs: [
    {
      key: 'user',
      label: 'The created account',
      description: 'Identity only — id, email, names, role and organisation. Never a password.',
    },
    {
      key: 'invited',
      label: 'Whether the invitation was sent',
      description: 'True once the emailed link has gone out. False means the account exists and an administrator can re-send it from the Users page.',
    },
  ],
};
