/**
 * Named-operator rule evaluation, for trigger entry rules.
 *
 * Distinct from `expression.ts`, which evaluates JS-style comparisons
 * (`{{total}} > 1000`) for gateways. Triggers carry structured rules
 * (`{ field, operator, value }`) chosen from a dropdown, so they need a named
 * vocabulary — and that vocabulary is advertised to the designer and to the AI.
 *
 * G1 applies here in full: anything advertised must be implemented, and an
 * unrecognised operator must fail loudly. A rule evaluator that answers "true"
 * for an operator it does not understand silently fires every workflow.
 */

import { compareOrder } from './expression';

export const SUPPORTED_RULE_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
  'isNull',
  'isNotNull',
  'changed',
] as const;

export type RuleOperator = (typeof SUPPORTED_RULE_OPERATORS)[number];

export const RULE_OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is one of',
  notIn: 'is not one of',
  isNull: 'is empty',
  isNotNull: 'is not empty',
  changed: 'changed',
};

export interface Rule {
  field: string;
  operator: string;
  value?: unknown;
}

/** Dot-path read, so rules can address nested trigger data. */
function readPath(data: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as any)[key]), data);
}

/**
 * Ordering comparison — the SAME rules as expression.ts (numbers, then ISO dates,
 * then lexical), so a trigger rule and a gateway condition never disagree about
 * whether "10" is greater than "9". A missing value orders against nothing:
 * every gt/lt against null is false.
 */
function compareValues(a: unknown, b: unknown): number {
  return compareOrder(a, b) ?? Number.NaN;
}

/** Case-insensitive text test; null/undefined never matches. */
function textTest(actual: unknown, expected: unknown, fn: (h: string, n: string) => boolean): boolean {
  if (actual === null || actual === undefined) return false;
  return fn(String(actual).toLowerCase(), String(expected ?? '').toLowerCase());
}

/** Membership list: a real array, or the comma-separated string a text input produces. */
function toList(expected: unknown, operator: string): string[] {
  if (Array.isArray(expected)) return expected.map((v) => String(v).trim());
  if (typeof expected === 'string') {
    return expected.split(',').map((v) => v.trim()).filter(Boolean);
  }
  throw new Error(
    `Rule operator "${operator}" expects a list (array or comma-separated string), received ${typeof expected}.`,
  );
}

/**
 * Evaluate one rule against the trigger data.
 * Throws on an operator outside SUPPORTED_RULE_OPERATORS.
 */
export function evaluateRule(rule: Rule, data: Record<string, unknown>): boolean {
  const actual = readPath(data, rule.field);
  const expected = rule.value;

  switch (rule.operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return compareValues(actual, expected) > 0;
    case 'gte':
      return compareValues(actual, expected) >= 0;
    case 'lt':
      return compareValues(actual, expected) < 0;
    case 'lte':
      return compareValues(actual, expected) <= 0;
    case 'contains':
      return textTest(actual, expected, (h, n) => h.includes(n));
    case 'startsWith':
      return textTest(actual, expected, (h, n) => h.startsWith(n));
    case 'endsWith':
      return textTest(actual, expected, (h, n) => h.endsWith(n));
    case 'in':
      return toList(expected, rule.operator).includes(String(actual));
    case 'notIn':
      return !toList(expected, rule.operator).includes(String(actual));
    case 'isNull':
      return actual === null || actual === undefined || actual === '';
    case 'isNotNull':
      return !(actual === null || actual === undefined || actual === '');
    case 'changed': {
      // Update events carry the changed-field list; anything else cannot have changed.
      const changed = (data as any)?._changedFields;
      return Array.isArray(changed) && changed.includes(rule.field);
    }
    default:
      throw new Error(
        `Unknown rule operator "${rule.operator}". Supported: ${SUPPORTED_RULE_OPERATORS.join(', ')}.`,
      );
  }
}

/**
 * Evaluate a rule set. No rules means "no entry condition" and passes — the
 * only silent-true here, and it is the documented meaning of an empty filter.
 */
export function matchesRules(
  config: { rules?: Rule[]; logic?: string } | undefined,
  data: Record<string, unknown>,
): boolean {
  const rules = config?.rules ?? [];
  if (rules.length === 0) return true;
  const logic = String(config?.logic ?? 'AND').toUpperCase();
  return logic === 'OR'
    ? rules.some((r) => evaluateRule(r, data))
    : rules.every((r) => evaluateRule(r, data));
}
