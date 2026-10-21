import { matchesRules, RULE_OPERATOR_LABELS } from './pulses/core/rule-evaluator';
import type { Rule } from './pulses/core/rule-evaluator';

/** The pulse type that marks a workflow as startable from the UI. */
export const MANUAL_START_TYPE = 'trigger.manualStart';

/** "Allowed when" on a manual start: the record must meet these for a start to be accepted. */
export interface StartCondition {
  logic: 'AND' | 'OR';
  rules: Rule[];
}

export interface StartableTrigger {
  nodeId: string;
  source: 'record' | 'list';
  entity?: string;
  allowedWhen?: StartCondition;
}

/** The trigger's condition, or undefined when it has none (an empty rule list is no condition). */
export function startCondition(config: any): StartCondition | undefined {
  const rules = Array.isArray(config?.rules) ? config.rules.filter((r: any) => r && r.field && r.operator) : [];
  if (!rules.length) return undefined;
  return { logic: String(config?.logic ?? 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND', rules };
}

/** One rule in the words a person reads: "status is not one of DISBURSED, CLOSED". */
export function describeRule(rule: Rule): string {
  const op = (RULE_OPERATOR_LABELS as any)[rule.operator] ?? rule.operator;
  if (rule.operator === 'isNull' || rule.operator === 'isNotNull') return rule.field + ' ' + op;
  const value = Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value ?? '');
  return rule.field + ' ' + op + ' ' + value;
}

/**
 * May this record start the workflow through this trigger?
 *
 * Only a RECORD trigger has a record to test; a list start has none, so its condition cannot apply.
 * A rule the evaluator cannot run refuses the start (fail closed) — a guard that throws its way to
 * "allowed" is the bug this exists to prevent.
 */
export function startAllowed(
  trigger: StartableTrigger,
  record: Record<string, unknown> | undefined,
): { ok: true } | { ok: false; reason: string } {
  const cond = trigger.allowedWhen;
  if (!cond || trigger.source !== 'record') return { ok: true };
  if (!record) return { ok: false, reason: 'This workflow starts from a record, and no record was given.' };
  let ok: boolean;
  try {
    ok = matchesRules(cond, record);
  } catch (err: any) {
    return { ok: false, reason: 'Its start condition cannot be checked: ' + String(err?.message ?? err) };
  }
  if (ok) return { ok: true };
  const now = cond.rules.map((r) => r.field + ' is ' + String((record as any)[r.field] ?? 'empty'));
  const unique = now.filter((v, i) => now.indexOf(v) === i);
  return {
    ok: false,
    reason: 'It can only start when ' + cond.rules.map(describeRule).join(cond.logic === 'OR' ? ' or ' : ' and ')
      + ' (now ' + unique.join(', ') + ').',
  };
}

export interface WorkflowLike {
  status?: string | null;
  entityName?: string | null;
  definition?: any;
}

export type StartVerdict =
  | { ok: true; trigger: StartableTrigger }
  /** inactive = not live; notManual = no manual trigger drawn; forbidden = cannot read the entity. */
  | { ok: false; reason: 'inactive' | 'notManual' | 'forbidden'; entity?: string };

/** Every manual-start trigger a workflow definition declares. */
export function manualTriggers(
  definition: any,
  fallbackEntity?: string | null,
): StartableTrigger[] {
  const nodes: any[] = Array.isArray(definition?.nodes) ? definition.nodes : [];
  return nodes
    .filter((n) => n?.type === MANUAL_START_TYPE)
    .map((n) => ({
      nodeId: String(n.id),
      source: (n?.config?.source === 'list' ? 'list' : 'record') as 'record' | 'list',
      // The trigger may name its own entity; otherwise the workflow's does.
      entity: n?.config?.entity ? String(n.config.entity) : (fallbackEntity ?? undefined),
      ...(startCondition(n?.config) ? { allowedWhen: startCondition(n?.config) } : {}),
    }));
}

/**
 * May this caller read that entity?
 *
 * An absent permission map means unrestricted, matching the grounding service and the history
 * tool. A trigger with no entity cannot be checked against anything, so it needs an explicit map.
 */
export function canReadEntity(
  permissions: Record<string, Record<string, boolean> | undefined> | undefined,
  isPlatformAdmin: boolean,
  entity?: string,
): boolean {
  if (isPlatformAdmin || !permissions) return true;
  if (!entity) return false;
  const entry = permissions[String(entity).toLowerCase()];
  return !!(entry?.get || entry?.getAll);
}

/**
 * Whether this workflow may be started by hand, and through which trigger.
 *
 * Order matters and is asserted: an inactive workflow is refused before permissions are
 * consulted, so the answer never depends on who is asking about a workflow that is not running.
 */
/**
 * The variables a manual start seeds the run with.
 *
 * The record is present TWICE on purpose. Its fields are spread flat because every workflow
 * authored so far reads them that way (`variables.status`, `variables.total`). It is ALSO set whole
 * as `record`, because that is what the manual-start trigger checks: a start "from a record" whose
 * seed had only the flattened fields failed every run with NoTriggerRecord — the record was loaded,
 * permission-checked, and then never handed over under the name the trigger looks for.
 *
 * The LOADED record wins over caller-supplied variables. They used to come last "so an explicit
 * value still wins" — which let a read-only caller POST { variables: { status: 'APPROVED',
 * amount: 1 } } and have the workflow branch on, and write, values the row does not have. Extra
 * variables that do not collide with a record field are still passed through.
 */
export function seedVariables(
  record: Record<string, unknown> | undefined,
  variables: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const extra = { ...(variables ?? {}) };
  delete (extra as any).record;
  return {
    ...extra,
    ...(record ?? {}),
    ...(record ? { record } : {}),
  };
}

/** Pulses that write the app's data. A manual start of a graph containing one needs write rights. */
export const WRITE_PULSE_TYPES = new Set([
  'data.createRecord', 'data.updateRecord', 'data.deleteRecord', 'data.transitionState',
  // Creating a login is a write, and the heaviest one in the catalogue: a manual start of a graph
  // that contains it needs write rights like any other.
  'identity.createUser',
]);

export function graphWrites(definition: any): boolean {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes : [];
  return nodes.some((n: any) => WRITE_PULSE_TYPES.has(String(n?.type ?? '')));
}

/** Reading is get/getAll; writing is any of create/update/delete on the entity. */
export function canWriteEntity(
  permissions: Record<string, Record<string, boolean> | undefined> | undefined,
  isPlatformAdmin: boolean,
  entity?: string,
): boolean {
  if (isPlatformAdmin || !permissions) return true;
  if (!entity) return false;
  const entry = permissions[String(entity).toLowerCase()];
  return !!(entry?.update || entry?.create || entry?.delete);
}

export function evaluateStart(
  wf: WorkflowLike,
  opts: {
    hasRecordId: boolean;
    permissions?: Record<string, Record<string, boolean> | undefined>;
    isPlatformAdmin?: boolean;
  },
): StartVerdict {
  if (String(wf.status ?? '').toUpperCase() !== 'ACTIVE') {
    return { ok: false, reason: 'inactive' };
  }

  const triggers = manualTriggers(wf.definition, wf.entityName);
  if (!triggers.length) return { ok: false, reason: 'notManual' };

  // Match the surface the caller actually used: a record id means the record trigger.
  const trigger =
    triggers.find((t) => (opts.hasRecordId ? t.source === 'record' : t.source === 'list')) ??
    triggers[0];

  if (!canReadEntity(opts.permissions, !!opts.isPlatformAdmin, trigger.entity)) {
    return { ok: false, reason: 'forbidden', entity: trigger.entity };
  }
  return { ok: true, trigger };
}
