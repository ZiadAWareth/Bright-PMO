/**
 * Entity-event payloads for workflow triggers.
 *
 * G16 — change detection used `JSON.stringify(before) !== JSON.stringify(after)`,
 * which is wrong in five ways:
 *   - key order: two equal objects serialise differently -> false positive
 *   - Date: serialises differently from the ISO string the DB returns -> false positive
 *   - undefined: disappears from the output -> false negative
 *   - NaN / Infinity: not valid JSON, serialise to null
 *   - it serialises every field on every update, for nothing
 *
 * A false positive fires a workflow that should not have run; a false negative
 * silently skips one that should have. `fieldChanged` below handles each case
 * explicitly.
 */

/** Deep, order-insensitive key sort, so object comparison is stable. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/** True when a single field's value actually differs. */
export function fieldChanged(before: unknown, after: unknown): boolean {
  // null and undefined mean the same thing here: absent.
  const beforeAbsent = before === null || before === undefined;
  const afterAbsent = after === null || after === undefined;
  if (beforeAbsent && afterAbsent) return false;
  if (beforeAbsent || afterAbsent) return true;

  // Dates compare by instant, however they arrived (Date or ISO string).
  if (before instanceof Date || after instanceof Date) {
    const b = before instanceof Date ? before.getTime() : Date.parse(String(before));
    const a = after instanceof Date ? after.getTime() : Date.parse(String(after));
    if (!Number.isNaN(b) && !Number.isNaN(a)) return b !== a;
  }

  // NaN is not equal to itself, but for change detection it has not changed.
  if (typeof before === 'number' && typeof after === 'number') {
    if (Number.isNaN(before) && Number.isNaN(after)) return false;
    return before !== after;
  }

  if (typeof before !== 'object' || typeof after !== 'object') return before !== after;

  return JSON.stringify(sortKeys(before)) !== JSON.stringify(sortKeys(after));
}

/**
 * Build the trigger payload for an update event, with change metadata attached.
 * Internal keys are prefixed with `_` so they never collide with entity fields.
 */
export function buildUpdateEventPayload(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown>,
) {
  const changedFields: string[] = [];
  if (previous) {
    for (const key of Object.keys(current)) {
      if (key.startsWith('_')) continue;
      if (fieldChanged(previous[key], current[key])) changedFields.push(key);
    }
  }
  return { ...current, _previous: previous, _changedFields: changedFields };
}

/** True when watchFields is unspecified, or any watched field actually changed. */
export function matchesWatchFields(
  triggerConfig: { watchFields?: string[] | string } | undefined,
  changedFields: string[] | undefined,
): boolean {
  const raw = triggerConfig?.watchFields;
  if (!raw) return true;
  const watchList = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (watchList.length === 0) return true;
  return watchList.some((f) => (changedFields ?? []).includes(f));
}
