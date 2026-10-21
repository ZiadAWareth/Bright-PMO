/**
 * Permissions for the legacy roles on the new backend (Soul's RolesAndPermissions).
 *
 * A STARTING POINT, derived from the legacy rules (both files on the dev branch):
 * the page access in PMO-Client/src/lib/route-access.ts and the API
 * restrictions in PMO-Legacy-API/src/middleware.ts. The legacy API let any
 * signed-in user call almost everything, so this is already stricter. Review it
 * with the business, then tune it here and re-run the migration (a re-run
 * overwrites changes made to these roles in Soul's admin panel).
 *
 * Soul's permissions are yes/no per entity and action, with no "own rows" scope,
 * so "a PJM edits only their projects" is not expressible here; that is custom
 * backend code later.
 */

export const LEGACY_ROLES = [
  'ADMIN', 'PJM', 'PMO', 'FIN', 'PROC', 'ENG', 'SITE', 'QAQC', 'IT', 'DIR', 'HR', 'LEGAL', 'SYSTEM',
];

/** Roles that get every permission, like Soul's own "Organisation Admin". */
export const FULL_ACCESS_ROLES = ['ADMIN', 'SYSTEM'];

const ALL = LEGACY_ROLES.filter((r) => !FULL_ACCESS_ROLES.includes(r));
const DELIVERY = ['PJM', 'PMO', 'DIR'];

/**
 * Entity groups (lowercase model names, as Soul keys them) and who may write
 * (create, update, delete) and read (get, getAll). FULL_ACCESS_ROLES are
 * implied. An entity in no group gets no permissions for other roles.
 */
export const GROUPS = [
  {
    name: 'Organisation and access (pickers need read)',
    entities: ['organization', 'businessunit', 'organizationsettings'],
    write: [],
    read: ALL,
  },
  {
    name: 'Users (User Management page: PMO, HR, DIR)',
    entities: ['user', 'userprofile'],
    write: ['PMO', 'HR', 'DIR'],
    read: ALL,
  },
  {
    name: 'Roles (legacy /api/roles: PMO, HR, DIR read)',
    entities: ['rolesandpermissions'],
    write: [],
    read: ['PMO', 'HR', 'DIR'],
  },
  {
    name: 'Integrations and sign-in internals (ADMIN only)',
    entities: ['apikey', 'integrationconnection', 'refreshtoken', 'idpinboxevent'],
    write: [],
    read: [],
  },
  {
    name: 'Templates and configuration (PMO maintains)',
    entities: [
      'workflow', 'workflowrule', 'approvalpolicy', 'approvalpolicystep', 'lifecycletemplate',
      'lifecycletemplatestep', 'closuretemplate', 'closuretemplateitem', 'workcalendar',
      'calendarexception', 'projectcategory', 'benchmark',
    ],
    write: ['PMO'],
    read: ALL,
  },
  {
    name: 'EPS and portfolios',
    entities: ['eps', 'portfolio'],
    write: DELIVERY,
    read: ALL,
  },
  {
    name: 'Project set-up, schedule and Agile planning',
    entities: [
      'project', 'projectmember', 'projectlifecyclestep', 'projectconflict', 'workitemstatus',
      'statustransition', 'recurringworkitem', 'wbsnode', 'baseline', 'baselineitem',
      'evmsnapshot', 'sprint', 'sprintcapacity', 'sprintsnapshot', 'release', 'progressreport',
    ],
    write: DELIVERY,
    read: ALL,
  },
  {
    name: 'Day-to-day work (every team member)',
    entities: [
      'workitem', 'workitemassignee', 'workitemdependency', 'workitemlink', 'comment',
      'commentmention', 'document', 'checklist', 'checklistitem', 'punchlistitem', 'inspection',
      'handover', 'lesson', 'timesheet', 'timeentry', 'approvalrequest', 'approvalstep',
      'notification', 'alert', 'escalation', 'activitylog', 'savedreport',
    ],
    write: ALL,
    read: ALL,
  },
  {
    name: 'Closure',
    entities: ['projectclosure', 'closureitem'],
    write: [...DELIVERY, 'QAQC'],
    read: ALL,
  },
  {
    name: 'Resources',
    entities: ['resource', 'resourceassignment'],
    write: [...DELIVERY, 'HR'],
    read: ALL,
  },
  {
    name: 'Risks',
    entities: ['risk', 'riskmitigation'],
    write: DELIVERY,
    read: ALL,
  },
  {
    name: 'Procurement (legacy API: PROC, PJM, PMO, DIR only)',
    entities: ['vendor', 'procurement', 'rfqresponse', 'contract'],
    write: ['PROC', ...DELIVERY],
    read: ['PROC', ...DELIVERY, 'LEGAL', 'FIN'],
  },
  {
    name: 'Budget and costs',
    entities: ['budgetline', 'costtransaction'],
    write: ['FIN', ...DELIVERY],
    read: ALL,
  },
  {
    name: 'Sites and equipment',
    entities: ['site', 'equipmentsitelog', 'maintenanceschedule', 'maintenancelog'],
    write: ['SITE', 'ENG', ...DELIVERY],
    read: ALL,
  },
];

const WRITE_ACTIONS = ['create', 'update', 'delete'];
const READ_ACTIONS = ['get', 'getAll'];

/**
 * Soul's entityPermissions JSON for `role`, shaped like `template` (the seeded
 * "Organisation Admin" row, which has every entity and action set to true).
 */
export function permissionsFor(role, template) {
  const full = FULL_ACCESS_ROLES.includes(role);
  const out = {};
  for (const [entity, actions] of Object.entries(template)) {
    out[entity] = Object.fromEntries(Object.keys(actions).map((a) => [a, full]));
  }
  if (full) return out;

  for (const group of GROUPS) {
    const canWrite = group.write.includes(role);
    const canRead = canWrite || group.read.includes(role);
    for (const entity of group.entities) {
      if (!out[entity]) throw new Error(`Unknown entity "${entity}" in group "${group.name}"`);
      for (const a of READ_ACTIONS) if (a in out[entity]) out[entity][a] = canRead;
      for (const a of WRITE_ACTIONS) if (a in out[entity]) out[entity][a] = canWrite;
    }
  }
  return out;
}
