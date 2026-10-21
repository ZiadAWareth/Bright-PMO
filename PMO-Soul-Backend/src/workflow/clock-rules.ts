import { createHash, timingSafeEqual } from 'crypto';

/**
 * Pure time rules for the workflow engine. No I/O, no Nest, no dependency.
 *
 * - 5-field cron (minute hour day-of-month month day-of-week) with *, lists, ranges, steps and
 *   month/day names; standard Vixie semantics for day-of-month vs day-of-week (either matches when
 *   both are restricted).
 * - Time zones are IANA names resolved through Intl, so a schedule reads as the author wrote it
 *   ("09:00 Europe/London") whatever the host's clock is set to.
 */

export const DEFAULT_TIMEZONE = 'UTC';

/**
 * The label a fired wait is resumed with. Deliberately NOT a branch time.wait declares: the
 * interpreter routes a label no edge carries to the UNLABELLED edges, which is the continuation,
 * whereas resuming with no label at all would follow every edge — including the timeout one.
 */
/** @deprecated The clock now resumes an elapsed wait with an explicit continuation
 *  (branch null); the interpreter still accepts this label as an alias while anything old
 *  sends it. */
export const WAIT_ELAPSED_BRANCH = 'elapsed';
export const WAIT_TIMEOUT_BRANCH = 'timeout';
/** Sweep decision: continue on the wait's unlabelled edges (resumeTimer branch = null). */
export const WAIT_CONTINUE_ACTION = 'continue';

/** How far ahead nextRunAt searches before declaring the expression unreachable (e.g. 31 Feb). */
const MAX_LOOKAHEAD_MS = 5 * 366 * 86_400_000;

interface CronField {
  any: boolean;
  values: Set<number>;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DOW_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: string[];
  namesFrom?: number;
}

const FIELD_SPECS: FieldSpec[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTH_NAMES, namesFrom: 1 },
  // 7 is accepted as an alias of Sunday (0), as most crons do.
  { name: 'day of week', min: 0, max: 7, names: DOW_NAMES, namesFrom: 0 },
];

function parseValue(token: string, spec: FieldSpec): number {
  const lower = token.toLowerCase();
  if (spec.names) {
    const idx = spec.names.indexOf(lower);
    if (idx >= 0) return idx + (spec.namesFrom ?? 0);
  }
  if (!/^\d+$/.test(token)) {
    throw new Error('"' + token + '" is not a valid ' + spec.name + ' value.');
  }
  const n = Number(token);
  if (n < spec.min || n > spec.max) {
    throw new Error(spec.name + ' value ' + n + ' is out of range ' + spec.min + '-' + spec.max + '.');
  }
  return n;
}

function parseField(raw: string, spec: FieldSpec): CronField {
  const values = new Set<number>();
  let any = false;
  for (const part of raw.split(',')) {
    if (!part) throw new Error('empty list item in ' + spec.name + ' field.');
    const [rangeRaw, stepRaw, extra] = part.split('/');
    if (extra !== undefined) throw new Error('"' + part + '" has more than one "/" in the ' + spec.name + ' field.');
    let step = 1;
    if (stepRaw !== undefined) {
      if (!/^\d+$/.test(stepRaw) || Number(stepRaw) < 1) {
        throw new Error('"' + part + '": the step after "/" must be a positive number.');
      }
      step = Number(stepRaw);
    }
    let lo: number;
    let hi: number;
    if (rangeRaw === '*') {
      lo = spec.min;
      hi = spec.max;
      if (stepRaw === undefined) {
        any = true;
        continue;
      }
    } else if (rangeRaw.includes('-')) {
      const [a, b, more] = rangeRaw.split('-');
      if (more !== undefined || !a || !b) throw new Error('"' + part + '" is not a valid range in the ' + spec.name + ' field.');
      lo = parseValue(a, spec);
      hi = parseValue(b, spec);
      if (lo > hi) throw new Error('"' + part + '": range start is after its end in the ' + spec.name + ' field.');
    } else {
      lo = parseValue(rangeRaw, spec);
      hi = stepRaw === undefined ? lo : spec.max;
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  // Day-of-week 7 means Sunday.
  if (spec.names === DOW_NAMES && values.has(7)) {
    values.delete(7);
    values.add(0);
  }
  return { any, values };
}

/** Parse a 5-field cron expression. Throws with a plain-language message. */
export function parseCron(expr: unknown): ParsedCron {
  const text = String(expr ?? '').trim();
  if (!text) throw new Error('Cron expression is empty.');
  const fields = text.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(
      'Cron expression "' + text + '" must have 5 fields (minute hour day-of-month month day-of-week), got ' + fields.length + '.',
    );
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields.map((f, i) => parseField(f, FIELD_SPECS[i]));
  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

/** null when valid, otherwise the reason — phrased for the person who typed it. */
export function validateCron(expr: unknown): string | null {
  try {
    parseCron(expr);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** null when the IANA zone is one this runtime knows, otherwise the reason. */
export function validateTimezone(tz: unknown): string | null {
  if (tz === undefined || tz === null || String(tz).trim() === '') return null; // default applies
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(tz) });
    return null;
  } catch {
    return 'Unknown time zone "' + String(tz) + '". Use an IANA name such as Europe/London or UTC.';
  }
}

interface LocalParts {
  minute: number;
  hour: number;
  day: number;
  month: number;
  dayOfWeek: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** The wall-clock parts of an instant in a zone. */
export function localParts(date: Date, timeZone: string): LocalParts {
  const out: Partial<LocalParts> = {};
  for (const p of formatter(timeZone).formatToParts(date)) {
    if (p.type === 'minute') out.minute = Number(p.value);
    else if (p.type === 'hour') out.hour = Number(p.value) % 24;
    else if (p.type === 'day') out.day = Number(p.value);
    else if (p.type === 'month') out.month = Number(p.value);
    else if (p.type === 'weekday') out.dayOfWeek = DOW_NAMES.indexOf(p.value.slice(0, 3).toLowerCase());
  }
  return out as LocalParts;
}

function dayMatches(cron: ParsedCron, p: LocalParts): boolean {
  const domOk = cron.dayOfMonth.any || cron.dayOfMonth.values.has(p.day);
  const dowOk = cron.dayOfWeek.any || cron.dayOfWeek.values.has(p.dayOfWeek);
  // Vixie cron: when both are restricted, either one matching is enough.
  if (!cron.dayOfMonth.any && !cron.dayOfWeek.any) return domOk || dowOk;
  return domOk && dowOk;
}

/**
 * The first instant strictly after "from" that the expression matches, or null when none exists
 * within the lookahead (an impossible date such as "0 0 31 2 *").
 *
 * Steps through UTC minutes and reads the wall clock in the zone at each candidate, jumping
 * ahead by a day or an hour when the coarser fields miss. A day-jump lands an hour SHORT of
 * midnight on purpose: a DST change can shift the local day boundary, and overshooting it would
 * skip a "0 0 * * *" on that day.
 */
export function nextRunAt(expr: string, from: Date, timeZone?: string): Date | null {
  const cron = parseCron(expr);
  const tz = timeZone && String(timeZone).trim() ? String(timeZone).trim() : DEFAULT_TIMEZONE;
  const start = Math.floor(from.getTime() / 60_000) * 60_000;
  const limit = start + MAX_LOOKAHEAD_MS;
  let t = start + 60_000;
  while (t <= limit) {
    const p = localParts(new Date(t), tz);
    const minutesIntoDay = p.hour * 60 + p.minute;
    if (!(cron.month.any || cron.month.values.has(p.month)) || !dayMatches(cron, p)) {
      t += Math.max(1, 24 * 60 - minutesIntoDay - 60) * 60_000;
      continue;
    }
    if (!(cron.hour.any || cron.hour.values.has(p.hour))) {
      t += (60 - p.minute) * 60_000;
      continue;
    }
    if (!(cron.minute.any || cron.minute.values.has(p.minute))) {
      t += 60_000;
      continue;
    }
    return new Date(t);
  }
  return null;
}

// ── trigger lookups ──────────────────────────────────────────────────────────

interface DefinitionLike {
  nodes?: Array<{ id?: string; kind?: string; type?: string; config?: Record<string, unknown> }>;
}

function triggerOfType(definition: unknown, type: string) {
  const nodes = (definition as DefinitionLike | undefined)?.nodes;
  if (!Array.isArray(nodes)) return undefined;
  return nodes.find((n) => n && n.kind === 'trigger' && n.type === type);
}

export interface ScheduledTrigger {
  nodeId: string;
  cron: string;
  timezone: string;
}

/** The trigger.scheduled node of a definition, or null. */
export function scheduledTrigger(definition: unknown): ScheduledTrigger | null {
  const node = triggerOfType(definition, 'trigger.scheduled');
  if (!node) return null;
  const cfg = node.config ?? {};
  const tz = String(cfg.timezone ?? '').trim();
  return { nodeId: String(node.id ?? ''), cron: String(cfg.cron ?? '').trim(), timezone: tz || DEFAULT_TIMEZONE };
}

export type WebhookMethod = 'POST' | 'GET' | 'PUT';

export interface WebhookTrigger {
  nodeId: string;
  path: string;
  method: WebhookMethod;
  secret: string;
}

export function normaliseWebhookMethod(method: unknown): WebhookMethod {
  const m = String(method ?? 'POST').toUpperCase();
  return m === 'GET' || m === 'PUT' ? m : 'POST';
}

/** The trigger.webhook node of a definition, or null. */
export function webhookTrigger(definition: unknown): WebhookTrigger | null {
  const node = triggerOfType(definition, 'trigger.webhook');
  if (!node) return null;
  const cfg = node.config ?? {};
  return {
    nodeId: String(node.id ?? ''),
    path: String(cfg.path ?? '').trim(),
    method: normaliseWebhookMethod(cfg.method),
    secret: String(cfg.secret ?? ''),
  };
}

/** A path is one URL segment: letters, digits, dashes, underscores, dots. */
export function validateWebhookPath(path: unknown): string | null {
  const p = String(path ?? '').trim();
  if (!p) return 'Webhook path is required.';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(p)) {
    return 'Webhook path "' + p + '" may only contain letters, digits, dots, dashes and underscores (max 128).';
  }
  return null;
}

/**
 * Problems that stop a definition from going ACTIVE, on the clock side: an invalid cron, an
 * unknown time zone, a schedule that never fires, a malformed webhook path. Path uniqueness needs
 * the database and lives in WorkflowClockService.activationProblems, which calls this first.
 */
export function clockProblems(definition: unknown, now: Date = new Date()): string[] {
  const problems: string[] = [];
  const sched = scheduledTrigger(definition);
  if (sched) {
    const cronProblem = validateCron(sched.cron);
    if (cronProblem) problems.push('Scheduled trigger: ' + cronProblem);
    const tzProblem = validateTimezone(sched.timezone);
    if (tzProblem) problems.push('Scheduled trigger: ' + tzProblem);
    if (!cronProblem && !tzProblem && nextRunAt(sched.cron, now, sched.timezone) === null) {
      problems.push('Scheduled trigger: "' + sched.cron + '" never fires (no matching date in the next five years).');
    }
  }
  const hook = webhookTrigger(definition);
  if (hook) {
    const pathProblem = validateWebhookPath(hook.path);
    if (pathProblem) problems.push('Webhook trigger: ' + pathProblem);
  }
  return problems;
}

// ── waits ────────────────────────────────────────────────────────────────────

/**
 * When a timer wait is due. Throws on an unreadable "until": the interpreter records the wait
 * BEFORE parking, so the error surfaces on the step instead of the run parking with no timer.
 */
export function waitTimerDueAt(config: { durationMs?: unknown; until?: unknown }, now: Date = new Date()): Date {
  if (config.until !== undefined && config.until !== null && String(config.until).trim() !== '') {
    const at = new Date(String(config.until));
    if (Number.isNaN(at.getTime())) {
      throw new Error('Wait: "until" is not a date/time: ' + String(config.until));
    }
    return at;
  }
  const ms = Number(config.durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error('Wait: duration is not a number of milliseconds: ' + String(config.durationMs));
  }
  return new Date(now.getTime() + ms);
}

// ── webhook request helpers ──────────────────────────────────────────────────

const DROPPED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-webhook-secret']);

/** Request headers as the workflow sees them: lower-cased, credentials removed. */
export function scrubWebhookHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const k = key.toLowerCase();
    if (DROPPED_HEADERS.has(k)) continue;
    out[k] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
  return out;
}

/** Constant-time secret comparison. Both sides are hashed first so lengths never leak. */
export function secretMatches(expected: unknown, provided: unknown): boolean {
  const a = createHash('sha256').update(String(expected ?? '')).digest();
  const b = createHash('sha256').update(String(provided ?? '')).digest();
  return timingSafeEqual(a, b);
}
