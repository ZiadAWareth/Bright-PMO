import type { GroundingPack } from '../agent/grounding';
import { controlledFields } from '../workflow/workflow-controlled-fields';

/** Marks a workflow as startable from a button. */
export const MANUAL_START_TYPE = 'trigger.manualStart';
/** The human step that parks a run until a person completes it. */
export const USER_TASK_TYPE = 'human.userTask';
/** Only live workflows are published: a draft describes automation that is not running. */
export const ACTIVE_STATUSES = new Set(['ACTIVE', 'PUBLISHED']);

/**
 * The sign-in methods this generator can serve.
 *
 * Restated here rather than imported from src/auth/auth-methods.ts, for the same reason
 * USER_TASK_TYPE is restated: this file is the pure projection and stays import-free apart
 * from the grounding types. A test reads both files and fails if the two lists drift.
 */
export const AUTH_METHOD_NAMES = ['password', 'otp'] as const;
export type AuthMethodName = (typeof AUTH_METHOD_NAMES)[number];

/** Whatever the settings row said, reduced to the methods this contract can honestly publish. */
export function contractAuthMethods(methods: readonly string[] | undefined): AuthMethodName[] {
  const wanted = new Set((methods ?? []).map((m) => String(m ?? '').trim().toLowerCase()));
  const kept = AUTH_METHOD_NAMES.filter((name) => wanted.has(name));
  // Never an empty list: a contract saying an app offers no way in would make a builder render a
  // screen with no form at all, and the app itself falls back to passwords in the same situation.
  return kept.length ? [...kept] : ['password'];
}

export interface ContractField {
  name: string;
  /** What to render. Derived from the schema, not guessed from the type name. */
  kind: 'scalar' | 'enum' | 'relation' | 'unsupported';
  type: string;
  required: boolean;
  list: boolean;
  /** Generated or id columns: show them, never put them in a form. */
  readOnly: boolean;
  /** Set by a live workflow (that workflow's name): the API refuses it, so it is read-only too. */
  controlledBy?: string;
  /** Resolved enum values, so a select needs no second lookup. */
  options?: string[];
  relation?: {
    target: string;
    cardinality: 'one' | 'many';
    /** The field to LABEL the related record with in a picker. */
    displayField?: string;
    foreignKeys: string[];
  };
}

export interface ContractRoute {
  method: string;
  path: string;
  operation: 'list' | 'read' | 'create' | 'update' | 'delete' | 'other';
  mutates: boolean;
  requiresAuth: boolean;
}

export interface ContractEntity {
  name: string;
  idField: string;
  displayField: string;
  description?: string;
  fields: ContractField[];
  routes: ContractRoute[];
  /**
   * POST here for one number: { fn: 'sum'|'avg'|'min'|'max'|'count', field?, where? }.
   *
   * ABSENT when this entity has no such route, and that is the whole point of publishing it: a
   * consumer reads the key to decide whether it may offer a "total" card at all, and degrades to
   * counts (which the list endpoint has always answered) when it is missing. So the key is not a
   * constant string assembled from the entity name — it is taken from the entity's DISCOVERED
   * routes, which come from Nest's own router. If the route was never registered, there is no key.
   */
  aggregate?: string;
}

export interface ContractHumanTask {
  nodeId: string;
  title: string;
  instructions?: string;
  /** Recipient spec as the author wrote it — a role, a user, or a template. */
  assignee?: string;
  fields: Array<{ key: string; label?: string }>;
  hasDeadline: boolean;
}

export interface ContractWorkflow {
  id: string;
  name: string;
  description?: string;
  entity?: string;
  /** Present when the workflow can be started from a button, and from where. */
  startableFrom: Array<{ nodeId: string; source: 'record' | 'list'; entity?: string;
    allowedWhen?: { logic: 'AND' | 'OR'; rules: Array<{ field: string; operator: string; value?: unknown }> } }>;
  /** Every point where this workflow stops and asks a person for something. */
  humanTasks: ContractHumanTask[];
}

export interface WorkflowDefinitionRow {
  id: string;
  name: string;
  description?: string | null;
  entityName?: string | null;
  status?: string | null;
  definition?: any;
}

export interface ContractAgent {
  id: string;
  name: string;
  role: string | null;
}

/** The Agent row as the service reads it. Only these three columns are ever selected. */
export interface AgentRow {
  id: string;
  name: string;
  role?: string | null;
}

/**
 * How a person gets into this app.
 *
 * Published because a builder designing the front door cannot be expected to guess the paths, and
 * because signUpEnabled is the one bit that decides whether a "Create an account" link belongs on
 * the page at all.
 *
 * It is NOT a constant. Public sign-up is a switch an administrator turns on in Settings → Sign-in &
 * Email: signUpEnabled is that switch, which is the same thing POST /api/auth/register itself checks.
 * It used to be hard-coded true, so every app published a "Create an account" link whether the app
 * wanted registrations or not.
 */
export interface ContractAuth {
  /** POST { email, password } — returns { accessToken, user }. */
  signIn: string;
  /** POST { email, password, firstName?, lastName? } — creates the account; returns no token. */
  signUp: string;
  /** Whether signUp accepts requests — i.e. whether public sign-up is switched on. */
  signUpEnabled: boolean;
  /**
   * How people prove who they are, as the administrator configured it: passwords, one-time codes,
   * or both. A sign-in screen renders from THIS, which is why the password field must disappear on
   * an app that offers codes only rather than being hidden by a guess about the app.
   */
  methods: AuthMethodName[];
  /**
   * POST { email } — emails a one-time code. Present ONLY when otp is offered, so a builder never
   * designs a screen around a route this app refuses. Answers identically for an address that has
   * an account and one that does not.
   */
  requestCode?: string;
  /** POST { email, code } — returns exactly what signIn returns. Present only when otp is offered. */
  verifyCode?: string;
  /**
   * Where an invited person sets their own password. GET ?token=... says whether the link is still
   * good; POST { token, password } sets it. Always published: an app can invite people whichever
   * methods it offers. A password-reset link lands here too.
   */
  setupPassword: string;
  /**
   * POST { email } — emails a password reset link. Present whenever passwords are offered. Whether it
   * WORKS right now depends on the app's email settings, which change at runtime, so a sign-in screen
   * reads it live from the public GET /auth/methods (passwordReset) rather than from this document.
   */
  forgotPassword?: string;
  /** The public sign-in facts, readable before anybody is signed in: { methods, passwordReset }. */
  publicMethods: string;
}

export interface ContractTasks {
  listPath: string;
  completePath: string;
  /** The columns a task row offers a page; the same on every app of this generator version. */
  fields: string[];
}

/** A workflow the UI has no part in, and the reason it is not a process a page can show. */
export interface ContractOtherWorkflow {
  id: string;
  name: string;
  entity?: string;
  /** 'inactive': a draft or switched off — activate it and it is published as a process.
   *  'automation': it runs by itself (a record event, a schedule) with no Start button and no
   *  task for a person, so no page is part of it. */
  reason: 'inactive' | 'automation';
  /** Its steps in run order (from the trigger), so a builder can draw what it does even though no
   *  page is part of it. Labels only; configuration stays inside the app. */
  steps: ContractWorkflowStep[];
}

export interface ContractWorkflowStep {
  id: string;
  /** The pulse type, e.g. 'trigger.recordCreated', 'integration.sendEmail'. */
  type: string;
  /** What the designer called it, else the type in words ("Send email"). */
  label: string;
  /** The type's family: trigger, human, data, integration, control, time, ai. */
  category: string;
}

export interface AppContract {
  appName: string;
  /** The Soul project this app was generated from. A consumer that wants Soul to regenerate
   *  something for this app needs it, and the app is the only place that reliably knows it. */
  soulProjectId?: string;
  /** This app's addresses (one origin each): the backend both front ends call, the admin panel
   *  and the designed frontend. Not part of contractVersion: moving the app does not change what
   *  it is. Each is absent when the deployment did not set it. */
  apiUrl?: string;
  adminUrl?: string;
  frontendUrl?: string;
  /** Changes whenever the shape does. A consumer stores it and diffs against it (Part 5). */
  contractVersion: string;
  generatedAt: string;
  /** Stated in the payload so a consumer cannot mistake names for stable ids. */
  identifiedBy: 'name';
  /** Sign-in and sign-up, so a builder can design the front door without guessing paths. */
  auth: ContractAuth;
  entities: ContractEntity[];
  workflows: ContractWorkflow[];
  /**
   * Every workflow NOT in "workflows", and why. A consumer that only saw "workflows" could not tell
   * "this app has no workflows" from "it has some, but none a page takes part in", and said the
   * first when the second was true. Name and reason only; nothing here is something a page binds to.
   */
  otherWorkflows: ContractOtherWorkflow[];
  /**
   * The agents an administrator built on the Agents page, as a page may bind to them. Identity
   * and job only — instructions and ceilings are the administrator's and stay inside the app.
   * A consumer asks one through POST /api/agent/ask with its id.
   */
  agents: ContractAgent[];
  /**
   * The signed-in user's workflow inbox. A page lists the user's OPEN tasks from listPath and
   * completes one by POSTing { formData } to completePath (":id" replaced). Published as paths,
   * not as an entity: the inbox is "mine", which no CRUD route on WorkflowTask expresses.
   */
  tasks: ContractTasks;
  /** The signed-in person's notification inbox (a designed page's bell). */
  notifications: {
    listPath: string;
    unreadCountPath: string;
    readPath: string;
    readAllPath: string;
    fields: string[];
  };
  /** Made visible rather than silent: a builder showing an empty list should be able to say why. */
  withheld: {
    entityCount: number;
    fields: Array<{ entity: string; field: string }>;
  };
}

/**
 * Prepend the app's global prefix, so every published path is one a browser can actually call.
 *
 * Idempotent: a path that already carries the prefix is left alone, because the catalogue's
 * behaviour is an implementation detail that may change and double-prefixing would be a subtler
 * break than the one this fixes.
 */
export function withApiPrefix(routePath, prefix) {
  const clean = String(prefix || '').split('/').filter(Boolean).join('/');
  if (!clean) return routePath;
  const path = String(routePath || '');
  if (path === '/' + clean || path.startsWith('/' + clean + '/')) return path;
  return '/' + clean + (path.startsWith('/') ? path : '/' + path);
}

/**
 * The aggregate route for an entity, or undefined when the app does not serve one.
 *
 * Engine-owned tables reach this with no aggregate route to find: the route is emitted inside the
 * generic CRUD controller, and the generator only writes that controller for the models its CRUD
 * skip list lets through (project-generator.service.js). Workflow, AgentSetting, MailSetting and
 * the rest never get a controller, so they never get a route, so this never finds one. The
 * exclusion is the CRUD skip list itself, not a second list kept in step with it by hand.
 */
export function aggregatePathFor(routes: readonly ContractRoute[], prefix: string): string | undefined {
  const found = routes.find(
    (route) => route.method === 'POST' && route.path.split('?')[0].endsWith('/aggregate'),
  );
  // Prefixed through the same helper as every other published path. The catalogue's paths have
  // already been through it, and it is idempotent, so this states the rule rather than relying on
  // the loop above having applied it.
  return found ? withApiPrefix(found.path, prefix) : undefined;
}

/** The task `form` is author-typed JSON, so it can legitimately be a list of bare strings. */
export function normaliseTaskFields(form: unknown): Array<{ key: string; label?: string }> {
  if (!Array.isArray(form)) return [];
  return form
    .map((f: any) => {
      if (typeof f === 'string') return { key: f };
      if (f && typeof f === 'object' && f.key) {
        return { key: String(f.key), label: f.label ? String(f.label) : undefined };
      }
      return null;
    })
    .filter((f): f is { key: string; label?: string } => f !== null);
}

/**
 * A stable digest of the touchpoints.
 *
 * Deliberately covers the task FIELDS, not just the workflow ids: renaming a collected field
 * changes what a page must render, and a version that did not move would tell every consumer
 * nothing had changed.
 */
/**
 * Publish an agent as a page may see it. Deliberately a projection, not a pass-through: a row
 * handed in with instructions or ceilings attached must not leak them, whoever forgot to select.
 */
export function buildContractAgents(rows: readonly AgentRow[]): ContractAgent[] {
  return rows
    .filter((r) => r && r.id != null && r.name)
    .map((r) => ({ id: String(r.id), name: String(r.name), role: r.role ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function fingerprintAgents(agents: ContractAgent[]): string {
  return agents.map((a) => a.id + ':' + a.name + ':' + (a.role ?? '')).sort().join('|');
}

/** A manual start's "Allowed when" rules, or undefined when it has none. Mirrors workflow-start.rules. */
function startConditionOf(config: any): { logic: 'AND' | 'OR'; rules: Array<{ field: string; operator: string; value?: unknown }> } | undefined {
  const rules = Array.isArray(config?.rules) ? config.rules.filter((r: any) => r && r.field && r.operator) : [];
  if (!rules.length) return undefined;
  return {
    logic: String(config?.logic ?? 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND',
    rules: rules.map((r: any) => ({ field: String(r.field), operator: String(r.operator), value: r.value })),
  };
}

export function fingerprintWorkflows(workflows: ContractWorkflow[]): string {
  const parts = workflows
    .map((w) =>
      [
        w.id,
        w.startableFrom.map((s) => s.nodeId + ':' + s.source + ':' + JSON.stringify(s.allowedWhen ?? null)).join(','),
        w.humanTasks.map((t) => t.nodeId + ':' + t.fields.map((f) => f.key).join('|')).join(','),
      ].join('~'),
    )
    .sort();
  let hash = 0;
  for (const ch of parts.join(';')) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return 'wf' + (hash >>> 0).toString(36);
}

/**
 * Reduce live workflow definitions to what a UI has to know: where a person is asked for
 * something, and where a button can start the flow. Workflows with neither are left out —
 * they are automation the UI has no part in.
 */
export function buildContractWorkflows(rows: readonly WorkflowDefinitionRow[]): ContractWorkflow[] {
  const out: ContractWorkflow[] = [];
  for (const row of rows) {
    if (!ACTIVE_STATUSES.has(String(row.status ?? '').toUpperCase())) continue;
    const nodes: any[] = Array.isArray(row.definition?.nodes) ? row.definition.nodes : [];

    const startableFrom = nodes
      .filter((n) => n?.type === MANUAL_START_TYPE)
      .map((n) => ({
        nodeId: String(n.id),
        source: (n?.config?.source === 'list' ? 'list' : 'record') as 'record' | 'list',
        entity: n?.config?.entity ? String(n.config.entity) : (row.entityName ?? undefined),
        // "Allowed when" (manual-start rules): published so a page can say why Start is unavailable.
        // The app enforces it on every start (workflow-start.rules startAllowed); this is information.
        ...(startConditionOf(n?.config) ? { allowedWhen: startConditionOf(n?.config) } : {}),
      }));

    const humanTasks = nodes
      .filter((n) => n?.type === USER_TASK_TYPE)
      .map((n) => ({
        nodeId: String(n.id),
        title: String(n?.config?.title ?? ''),
        instructions: n?.config?.instructions ? String(n.config.instructions) : undefined,
        assignee: n?.config?.assignee ? String(n.config.assignee) : undefined,
        // The author may leave the field list empty — completing is then an acknowledgement.
        fields: normaliseTaskFields(n?.config?.form),
        hasDeadline: Number(n?.config?.dueInHours) > 0,
      }));

    if (!startableFrom.length && !humanTasks.length) continue;

    out.push({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      entity: row.entityName ?? undefined,
      startableFrom,
      humanTasks,
    });
  }
  return out;
}

/** "integration.sendEmail" -> "Send email". */
function stepWords(type: string): string {
  const last = String(type || '').split('.').pop() || 'step';
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * A workflow's steps in the order it runs: breadth-first from its trigger(s) along the edges, then
 * anything unreachable in declaration order. Capped, so a huge flow cannot bloat the contract.
 */
export function workflowSteps(definition: any, limit = 12): ContractWorkflowStep[] {
  const nodes: any[] = Array.isArray(definition?.nodes) ? definition.nodes : [];
  const edges: any[] = Array.isArray(definition?.edges) ? definition.edges : [];
  const byId = new Map(nodes.map((n) => [String(n?.id), n]));
  const next = new Map<string, string[]>();
  for (const e of edges) {
    const from = String(e?.from ?? '');
    if (!next.has(from)) next.set(from, []);
    next.get(from)!.push(String(e?.to ?? ''));
  }
  const isTrigger = (n: any) => n?.kind === 'trigger' || String(n?.type ?? '').startsWith('trigger.');
  const order: string[] = [];
  const seen = new Set<string>();
  const queue = nodes.filter(isTrigger).map((n) => String(n.id));
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const to of next.get(id) || []) queue.push(to);
  }
  for (const n of nodes) if (!seen.has(String(n?.id))) order.push(String(n?.id));
  return order.slice(0, limit).map((id) => {
    const n = byId.get(id) || {};
    const type = String(n.type ?? '');
    return {
      id,
      type,
      label: typeof n.label === 'string' && n.label.trim() ? n.label.trim() : stepWords(type),
      category: type.includes('.') ? type.split('.')[0] : (n.kind ? String(n.kind) : 'step'),
    };
  });
}

/**
 * The workflows buildContractWorkflows leaves out, with the reason. Same rules, inverted — kept next
 * to it so the two can never disagree about what counts as a process.
 */
export function buildOtherWorkflows(rows: readonly WorkflowDefinitionRow[]): ContractOtherWorkflow[] {
  const published = new Set(buildContractWorkflows(rows).map((w) => w.id));
  const out: ContractOtherWorkflow[] = [];
  for (const row of rows) {
    if (published.has(row.id)) continue;
    const active = ACTIVE_STATUSES.has(String(row.status ?? '').toUpperCase());
    out.push({
      id: row.id,
      name: row.name,
      entity: row.entityName ?? undefined,
      reason: active ? 'automation' : 'inactive',
      steps: workflowSteps(row.definition),
    });
  }
  return out;
}

/**
 * Tables the engine owns, which no page binds to.
 *
 * WHY THIS LISTS THE ENGINE AND NOT THE CUSTOMER'S ENTITIES
 * The obvious inverse — bake the list of models the user authored and treat everything else as
 * plumbing — is the more dangerous one. A running app's schema can gain tables without a
 * redeploy, and every table gained that way is a CUSTOMER table. With a baked customer list, a
 * newly migrated entity would be classified as engine plumbing and vanish from the builder.
 *
 * Listing the engine instead cannot go stale in a way that hurts: an app generated by a given
 * version of Soul has exactly that version's engine tables, and the contract builder shipped
 * inside it knows exactly that set. A later Soul release adding an engine table does not affect
 * this app, because this app does not have that table until it is regenerated — at which point it
 * gets the new list too. Unknown entities default to bindable, which is the safe direction: a
 * designer seeing one table too many is a nuisance, a missing table is a blocked build.
 *
 * DELIBERATELY ABSENT, because end users legitimately see them:
 *   WorkflowTask  — "my pending approvals" is a real page, and the whole point of a human task.
 *   Notification  — "my notifications" likewise.
 *   User, Organization, BusinessUnit — profile, org switcher, "who am I".
 */
const ENGINE_ONLY_ENTITIES = new Set([
  // The in-app agent's own bookkeeping.
  'Agent', 'AgentSetting', 'AgentRun', 'AgentRunStep', 'AgentConversation', 'AgentMessage',
  // PULSE's definitions and execution history. A workflow is reached through its touchpoints in
  // contract.workflows, never by binding a page to the run table.
  'Workflow', 'WorkflowVersion', 'WorkflowRun', 'WorkflowRunStep',
  // The front door's own plumbing. A sign-in screen is designed from contract.auth, never by binding
  // a page to the table of live invite links.
  'MailSetting', 'AuthSetting', 'AuthSetupToken', 'AuthLoginCode', 'AuthSessionRevocation',
  // Connections to outside systems (encrypted): reached only through /api/connectors.
  'ConnectorConnection',
  // Dynamic Dashboards: the app's encrypted engine key and the pasted embed tokens. Reached only
  // through /api/dashboard-engine.
  'DashboardEngineConnection', 'DashboardEngineOrg', 'EmbeddedDashboard',
]);

/**
 * The front door, as a builder reads it.
 *
 * The two code routes are present ONLY when the app offers codes. A builder that sees a path assumes
 * it can call it, and a screen designed around /auth/request-code on a password-only app is a screen
 * whose "email me a code" button answers 403 in front of a user.
 */
export function buildContractAuth(
  signUpEnabled: boolean,
  methods: readonly string[],
  apiPrefix: string,
): ContractAuth {
  const offered = contractAuthMethods(methods);
  return {
    // Prefixed exactly like every other published path: the catalogue reports routes without the
    // app's global prefix, and a link to /auth/login on an app that serves /api/auth/login renders
    // perfectly and 404s on submit.
    signIn: withApiPrefix('/auth/login', apiPrefix),
    signUp: withApiPrefix('/auth/register', apiPrefix),
    // The truth, per app and per moment: the administrator's sign-up switch.
    signUpEnabled,
    methods: offered,
    ...(offered.includes('otp')
      ? {
          requestCode: withApiPrefix('/auth/request-code', apiPrefix),
          verifyCode: withApiPrefix('/auth/verify-code', apiPrefix),
        }
      : {}),
    setupPassword: withApiPrefix('/auth/setup-password', apiPrefix),
    ...(offered.includes('password') ? { forgotPassword: withApiPrefix('/auth/forgot-password', apiPrefix) } : {}),
    publicMethods: withApiPrefix('/auth/methods', apiPrefix),
  };
}

/** Project a grounding pack plus the live workflow rows into the contract. */
export function buildAppContract(
  pack: GroundingPack,
  workflowRows: readonly WorkflowDefinitionRow[],
  now: () => Date = () => new Date(),
  /** The app's global prefix — 'api' unless main.ts changes it. */
  apiPrefix: string = 'api',
  /** Soul's id for this app, from PROJECT_ID. */
  soulProjectId?: string,
  /** Rows from the Agents page. Optional: an app generated before agents existed has none. */
  agentRows: readonly AgentRow[] = [],
  /**
   * The sign-in methods the AuthSetting row names. Defaulted to passwords, which is what the app
   * itself falls back to when that row cannot be read.
   */
  authMethods: readonly string[] = ['password'],
  /** The app's addresses: { api, admin, frontend } (APP_API_URL / APP_ADMIN_URL / APP_FRONTEND_URL). */
  urls: { api?: string; admin?: string; frontend?: string } = {},
  /** Settings → Sign-in & Email: is public sign-up on? Off when the row cannot be read. */
  signUpEnabled: boolean = false,
): AppContract {
  // new RegExp, not a literal: this file is one template string, where a backslash would vanish.
  const clean = (u?: string) => (u && u.trim() ? u.trim().replace(new RegExp('/+$'), '') : undefined);
  const addresses: Record<string, string> = {};
  if (clean(urls.api)) addresses.apiUrl = clean(urls.api)!;
  if (clean(urls.admin)) addresses.adminUrl = clean(urls.admin)!;
  if (clean(urls.frontend)) addresses.frontendUrl = clean(urls.frontend)!;
  const enums = new Map(pack.schema.enums.map((e) => [e.name, e.values]));
  const displayFieldByEntity = new Map(
    pack.schema.entities.map((e) => [e.name.toLowerCase(), e.displayField]),
  );

  // Routes are grouped by the entity the catalogue already inferred, so the contract does not
  // re-guess the controller-to-model mapping.
  const routesByEntity = new Map<string, ContractRoute[]>();
  for (const route of pack.catalog.routes) {
    if (!route.entity) continue;
    const key = route.entity.toLowerCase();
    const list = routesByEntity.get(key) ?? [];
    list.push({
      method: route.method,
      // The route catalogue reports paths WITHOUT the app's global prefix, because it was built
      // for the assistant, which never calls them — it reasons about them. A UI builder does call
      // them, so a contract that says /order when the app serves /api/order produces a page that
      // renders perfectly and 404s on every fetch. Found exactly that way, in a browser.
      // (No backticks in this comment: it sits inside the emitted template literal.)
      path: withApiPrefix(route.path, apiPrefix),
      operation: route.operation,
      mutates: route.mutates,
      requiresAuth: route.requiresAuth,
    });
    routesByEntity.set(key, list);
  }

  // Fields live workflows own, from the same rows the workflows section reads.
  const controlledBy = controlledFields(workflowRows as any);
  const entities: ContractEntity[] = pack.schema.entities
    // Engine plumbing is not something a page designer binds to. Without this the UI Builder
    // offered AgentRunStep, WorkflowRunStep and friends alongside the app's real entities: for a
    // one-table app that is one business entity buried among a dozen internals, and a page could
    // be bound to a table whose shape is Soul's to change.
    .filter((entity) => !ENGINE_ONLY_ENTITIES.has(entity.name))
    .map((entity) => {
      const relationByField = new Map(entity.relations.map((r) => [r.field, r]));
      const routes = routesByEntity.get(entity.name.toLowerCase()) ?? [];
      const aggregate = aggregatePathFor(routes, apiPrefix);
      return {
        name: entity.name,
        idField: entity.idField,
        displayField: entity.displayField,
        description: entity.description,
        fields: entity.fields.map((field) => {
          const relation = relationByField.get(field.name);
          return {
            name: field.name,
            kind: field.kind,
            type: field.type,
            required: field.required,
            list: field.list,
            // An id or a generated column is displayable but never editable. Leaving that to the
            // builder to infer from the name is how createdAt ends up in a create form. A field a
            // live workflow sets is read-only too: the API refuses it (workflow-controlled-fields).
            readOnly: field.isId || field.generated || !!controlledBy[entity.name.toLowerCase()]?.[field.name],
            ...(controlledBy[entity.name.toLowerCase()]?.[field.name]
              ? { controlledBy: controlledBy[entity.name.toLowerCase()][field.name] }
              : {}),
            ...(field.kind === 'enum' && enums.has(field.type)
              ? { options: enums.get(field.type) }
              : {}),
            ...(relation
              ? {
                  relation: {
                    target: relation.target,
                    cardinality: relation.cardinality,
                    displayField: displayFieldByEntity.get(relation.target.toLowerCase()),
                    foreignKeys: relation.foreignKeys,
                  },
                }
              : {}),
          };
        }),
        routes,
        // Only where the route really exists — a consumer that sees this key will call it.
        ...(aggregate ? { aggregate } : {}),
      };
    });

  const workflows = buildContractWorkflows(workflowRows);
  const agents = buildContractAgents(agentRows);

  return {
    appName: pack.appName,
    soulProjectId,
    ...addresses,
    // The pack's own fingerprint plus the touchpoints, which it does not cover. Without the second
    // half, adding a User Task to a live workflow would leave the version unchanged and every
    // consumer would believe nothing had moved.
    // Agents join the version for the same reason workflows do: a page bound to an agent that was
    // renamed or removed must be told the shape moved.
    contractVersion:
      pack.version + '-' + fingerprintWorkflows(workflows) + '-' + fingerprintAgents(agents),
    generatedAt: now().toISOString(),
    identifiedBy: 'name',
    // Prefixed exactly like every other published path: the catalogue reports routes without the
    // app's global prefix, and a link to /auth/login on an app that serves /api/auth/login renders
    // perfectly and 404s on submit.
    auth: buildContractAuth(signUpEnabled, authMethods, apiPrefix),
    entities,
    workflows,
    otherWorkflows: buildOtherWorkflows(workflowRows),
    agents,
    tasks: {
      listPath: withApiPrefix('/workflow-tasks', apiPrefix),
      completePath: withApiPrefix('/workflow-tasks/:id/complete', apiPrefix),
      fields: ['title', 'instructions', 'status', 'dueAt', 'createdAt'],
    },
    // The signed-in person's own inbox (NotificationController, scoped to req.userId by the app), so a
    // designed page can carry a bell. Paths only — the rows are per user and never part of the contract.
    notifications: {
      listPath: withApiPrefix('/notifications', apiPrefix),
      unreadCountPath: withApiPrefix('/notifications/unread-count', apiPrefix),
      readPath: withApiPrefix('/notifications/:id/read', apiPrefix),
      readAllPath: withApiPrefix('/notifications/read-all', apiPrefix),
      fields: ['title', 'message', 'level', 'isRead', 'createdAt', 'entityName', 'entityRecordId'],
    },
    withheld: {
      entityCount: pack.hiddenByPermissionCount,
      fields: pack.redactedFields.map((f) => ({ entity: f.entity, field: f.field })),
    },
  };
}
