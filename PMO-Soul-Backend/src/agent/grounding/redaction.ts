/**
 * The single redaction boundary for everything the agent may see.
 *
 * Structural rule: field NAMES are not secret, field VALUES can be. The grounding pack therefore
 * still tells the model that `User.password` exists — that is how it knows not to ask for it, and
 * how it explains the schema accurately — while no code path can ever hand it the value.
 */

/** Why a field was withheld. Surfaced in the UI so redaction is visible, not silent. */
export type RedactionReason = 'credential' | 'annotated';

/** Placeholder substituted for a withheld value. A marker, never an empty string: the model must
 *  be able to tell "withheld" apart from "empty", or it will report the record as incomplete. */
export const REDACTED = '[redacted]';

/**
 * Name patterns that mark a value as never-leaves-the-building.
 *
 * Broad on purpose. A false positive costs the agent one value it almost certainly did not need;
 * a false negative ships a credential to a third-party inference API and cannot be undone.
 */
export const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /pass(word|wd|phrase)/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /credential/i,
  /(^|[^a-z])salt([^a-z]|$)/i,
  /hash/i,
  /signature/i,
  /session/i,
  /\bcookie\b/i,
  /(^|[^a-z])otp([^a-z]|$)/i,
  /\b(mfa|totp|2fa)\b/i,
  /ssn|social[-_]?security/i,
  /(credit)?[-_]?card[-_]?(number|no)?/i,
  /\b(cvv|cvc|iban|swift)\b/i,
];

/** `/// @sensitive` on a Prisma field forces redaction regardless of its name. */
export const SENSITIVE_ANNOTATION = /@sensitive\b/i;

/** `/// @public` is the escape hatch for a field the patterns over-match — e.g. a
 *  `sessionLabel` column that holds nothing secret. Explicit, per-field, and auditable. */
export const PUBLIC_ANNOTATION = /@public\b/i;

export interface FieldClassification {
  sensitive: boolean;
  reason?: RedactionReason;
}

/**
 * Decides whether one field's values may leave. `documentation` is the Prisma `///` comment,
 * which is the only place a schema author can express intent.
 */
export function classifyField(fieldName: string, documentation?: string): FieldClassification {
  const doc = documentation || '';
  if (SENSITIVE_ANNOTATION.test(doc)) return { sensitive: true, reason: 'annotated' };
  if (PUBLIC_ANNOTATION.test(doc)) return { sensitive: false };
  if (matchesSensitivePattern(fieldName)) return { sensitive: true, reason: 'credential' };
  return { sensitive: false };
}

export function matchesSensitivePattern(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

/** A field the policy knows about, as produced by the schema context. */
export interface RedactedFieldRef {
  entity: string;
  field: string;
  reason: RedactionReason;
}

export interface RedactionPolicy {
  /** Layer 1 + layer 2 combined. Callers never test patterns themselves. */
  isSensitive(entity: string, field: string): boolean;
  /** Everything withheld, for the "what this app knows about itself" page. */
  list(): RedactedFieldRef[];
}

/**
 * Builds the policy from the schema pack. Entities are keyed case-insensitively because the
 * permission layer already lowercases entity names and the two must not disagree.
 */
export function buildRedactionPolicy(
  entities: Array<{ name: string; fields: Array<{ name: string; sensitive?: boolean; redactionReason?: RedactionReason }> }>,
): RedactionPolicy {
  const declared = new Map<string, RedactionReason>();
  const refs: RedactedFieldRef[] = [];

  for (const entity of entities) {
    for (const field of entity.fields) {
      if (!field.sensitive) continue;
      const reason = field.redactionReason || 'credential';
      declared.set(key(entity.name, field.name), reason);
      refs.push({ entity: entity.name, field: field.name, reason });
    }
  }

  return {
    isSensitive(entity: string, field: string): boolean {
      if (declared.has(key(entity, field))) return true;
      // Layer 2 — the object may carry keys the schema never declared.
      return matchesSensitivePattern(field);
    },
    list: () => [...refs],
  };
}

/** A policy that withholds nothing declared but still applies the defensive name check. Used when
 *  a caller has no schema pack to hand; never used to bypass redaction, because it cannot. */
export function defaultRedactionPolicy(): RedactionPolicy {
  return buildRedactionPolicy([]);
}

/**
 * THE choke point. Every record value that moves toward a model passes through here.
 *
 * Recurses into nested objects and arrays: a Prisma `include` returns related records inline, so
 * a shallow pass would redact `User.password` on the user row and hand it over untouched under
 * `ticket.assignee.password`. Nested keys are checked against the defensive layer regardless of
 * which entity they came from, since the relation's entity name is not recoverable from the shape.
 */
export function redactRecord<T>(entity: string, row: T, policy: RedactionPolicy): T {
  return redactValue(entity, row, policy, 0) as T;
}

export function redactRecords<T>(entity: string, rows: T[], policy: RedactionPolicy): T[] {
  return rows.map((row) => redactRecord(entity, row, policy));
}

/** Depth cap: a cycle in an `include` graph must not turn redaction into a hang. */
const MAX_DEPTH = 8;

function redactValue(entity: string, value: unknown, policy: RedactionPolicy, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(entity, item, policy, depth + 1));
  }
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [field, fieldValue] of Object.entries(value)) {
    if (policy.isSensitive(entity, field)) {
      out[field] = REDACTED;
      continue;
    }
    out[field] = redactValue(entity, fieldValue, policy, depth + 1);
  }
  return out;
}

/** Dates, Decimals, Buffers and the like are values, not containers — recursing into them would
 *  destroy them. Only object literals are traversed. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function key(entity: string, field: string): string {
  return `${entity.toLowerCase()}.${field.toLowerCase()}`;
}
