/**
 * The schedule picker's pure logic: cron <-> the friendly choices, the plain-language summary, and
 * the next run times (the same rules as the server's nextRunAt). No React, so it can be tested alone.
 */

export type Mode = 'interval' | 'times' | 'custom';
export type Unit = 'minutes' | 'hours' | 'days';
export type Freq = 'daily' | 'weekdays' | 'days' | 'monthly';

export interface Model {
  mode: Mode;
  every: number;
  unit: Unit;
  /** Minute past the hour, for "every N hours". */
  atMinute: number;
  freq: Freq;
  /** HH:MM, 24-hour. */
  time: string;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  dayOfMonth: number;
  custom: string;
}

export const DAYS = [
  { v: 1, short: 'Mon', long: 'Monday' },
  { v: 2, short: 'Tue', long: 'Tuesday' },
  { v: 3, short: 'Wed', long: 'Wednesday' },
  { v: 4, short: 'Thu', long: 'Thursday' },
  { v: 5, short: 'Fri', long: 'Friday' },
  { v: 6, short: 'Sat', long: 'Saturday' },
  { v: 0, short: 'Sun', long: 'Sunday' },
];

export const pad = (n: number) => String(n).padStart(2, '0');
export const DEFAULT: Model = {
  mode: 'times',
  every: 15,
  unit: 'minutes',
  atMinute: 0,
  freq: 'daily',
  time: '09:00',
  days: [1],
  dayOfMonth: 1,
  custom: '0 9 * * *',
};

// ── cron ⇄ model ──────────────────────────────────────────────────────────────────────────────────

export function toCron(m: Model): string {
  if (m.mode === 'custom') return m.custom.trim();
  if (m.mode === 'interval') {
    // Cron steps cannot reach past their own field (*/75 minutes would mean "at :00").
    const cap = m.unit === 'minutes' ? 59 : m.unit === 'hours' ? 23 : 31;
    const n = Math.min(cap, Math.max(1, Math.floor(m.every) || 1));
    if (m.unit === 'minutes') return n === 1 ? '* * * * *' : '*/' + n + ' * * * *';
    if (m.unit === 'hours') return m.atMinute + ' ' + (n === 1 ? '*' : '*/' + n) + ' * * *';
    const [h, mi] = m.time.split(':').map(Number);
    return mi + ' ' + h + ' ' + (n === 1 ? '*' : '*/' + n) + ' * *';
  }
  const [h, mi] = m.time.split(':').map(Number);
  if (m.freq === 'daily') return mi + ' ' + h + ' * * *';
  if (m.freq === 'weekdays') return mi + ' ' + h + ' * * 1-5';
  if (m.freq === 'monthly') return mi + ' ' + h + ' ' + m.dayOfMonth + ' * *';
  const days = [...new Set(m.days)].sort((a, b) => a - b);
  return mi + ' ' + h + ' * * ' + (days.length ? days.join(',') : '1');
}

const isNum = (s: string, lo: number, hi: number) => /^\d+$/.test(s) && Number(s) >= lo && Number(s) <= hi;
const step = (s: string) => (/^\*\/(\d+)$/.exec(s) ? Number(/^\*\/(\d+)$/.exec(s)![1]) : s === '*' ? 1 : null);

/** Read a cron expression back into the choice that writes it; anything else is "Custom". */
export function fromCron(cron: string): Model {
  const text = String(cron || '').trim();
  if (!text) return DEFAULT;
  const f = text.split(/\s+/);
  const base: Model = { ...DEFAULT, custom: text };
  if (f.length !== 5) return { ...base, mode: 'custom' };
  const [mi, h, dom, mon, dow] = f;
  if (mon !== '*') return { ...base, mode: 'custom' };

  // Every N minutes
  if (h === '*' && dom === '*' && dow === '*' && step(mi) !== null) {
    return { ...base, mode: 'interval', unit: 'minutes', every: step(mi)! };
  }
  if (!isNum(mi, 0, 59)) return { ...base, mode: 'custom' };
  // Every N hours at :MM (hour is "*" or "*/N")
  if (dom === '*' && dow === '*' && step(h) !== null) {
    return { ...base, mode: 'interval', unit: 'hours', every: step(h)!, atMinute: Number(mi) };
  }
  if (!isNum(h, 0, 23)) return { ...base, mode: 'custom' };
  const time = pad(Number(h)) + ':' + pad(Number(mi));
  // Every N days at a time
  if (dow === '*' && /^\*\/\d+$/.test(dom)) return { ...base, mode: 'interval', unit: 'days', every: step(dom)!, time };
  if (dom === '*' && dow === '*') return { ...base, mode: 'times', freq: 'daily', time };
  if (dom === '*' && dow === '1-5') return { ...base, mode: 'times', freq: 'weekdays', time };
  if (dom === '*' && /^[0-7](,[0-7])*$/.test(dow)) {
    const days = [...new Set(dow.split(',').map((d) => Number(d) % 7))];
    return { ...base, mode: 'times', freq: 'days', days, time };
  }
  if (dow === '*' && isNum(dom, 1, 31)) return { ...base, mode: 'times', freq: 'monthly', dayOfMonth: Number(dom), time };
  return { ...base, mode: 'custom' };
}

// ── plain-language summary ────────────────────────────────────────────────────────────────────────

const plural = (n: number, w: string) => (n === 1 ? w : n + ' ' + w + 's');
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

export function summarize(m: Model): string {
  if (m.mode === 'custom') return 'Custom schedule';
  if (m.mode === 'interval') {
    const n = Math.max(1, Math.floor(m.every) || 1);
    if (m.unit === 'minutes') return 'Every ' + plural(n, 'minute');
    if (m.unit === 'hours') return 'Every ' + plural(n, 'hour') + (m.atMinute ? ', at ' + pad(m.atMinute) + ' minutes past' : ', on the hour');
    return 'Every ' + plural(n, 'day') + ' at ' + m.time;
  }
  if (m.freq === 'daily') return 'Every day at ' + m.time;
  if (m.freq === 'weekdays') return 'Every weekday (Monday to Friday) at ' + m.time;
  if (m.freq === 'monthly') return 'On the ' + ordinal(m.dayOfMonth) + ' of every month at ' + m.time;
  const names = DAYS.filter((d) => m.days.includes(d.v)).map((d) => d.long);
  const list = names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  return 'Every ' + (list || 'Monday') + ' at ' + m.time;
}

/** A step that does not divide its period restarts each hour / day / month — worth saying. */
export function caveat(m: Model): string | null {
  if (m.mode !== 'interval') return null;
  const n = Math.max(1, Math.floor(m.every) || 1);
  if (m.unit === 'minutes' && n > 59) return 'Use hours for gaps of an hour or more.';
  if (m.unit === 'hours' && n > 23) return 'Use days for gaps of a day or more.';
  if (m.unit === 'minutes' && n > 1 && 60 % n !== 0) return 'The count restarts at the top of every hour, so the gap before :00 is shorter.';
  if (m.unit === 'hours' && n > 1 && 24 % n !== 0) return 'The count restarts at midnight, so the gap across midnight is shorter.';
  if (m.unit === 'days' && n > 1) return 'The count restarts on the 1st of each month, so the gap across a month end can be shorter.';
  return null;
}

// ── next runs (same rules as the server's nextRunAt) ─────────────────────────────────────────────

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SPECS = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
];
type Field = { any: boolean; values: Set<number> };

function parseField(raw: string, i: number): Field {
  const spec = SPECS[i];
  const values = new Set<number>();
  let any = false;
  for (const part of raw.split(',')) {
    const [r, s] = part.split('/');
    const stepN = s === undefined ? 1 : Number(s);
    if (!Number.isInteger(stepN) || stepN < 1) throw new Error('bad step');
    let lo: number;
    let hi: number;
    if (r === '*') {
      lo = spec.min;
      hi = spec.max;
      if (s === undefined) {
        any = true;
        continue;
      }
    } else if (r.includes('-')) {
      [lo, hi] = r.split('-').map(Number);
    } else {
      lo = Number(r);
      hi = s === undefined ? lo : spec.max;
    }
    if (![lo, hi].every((x) => Number.isInteger(x) && x >= spec.min && x <= spec.max) || lo > hi) throw new Error('out of range');
    for (let v = lo; v <= hi; v += stepN) values.add(v);
  }
  if (i === 4 && values.has(7)) values.add(0);
  return { any, values };
}

export function nextRuns(cron: string, timeZone: string, count: number): Date[] | null {
  let fields: Field[];
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    fields = parts.map(parseField);
  } catch {
    return null;
  }
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
  } catch {
    return null;
  }
  const [fm, fh, fdom, fmon, fdow] = fields;
  const out: Date[] = [];
  let t = Math.floor(Date.now() / 60_000) * 60_000 + 60_000;
  const limit = t + 62 * 24 * 60 * 60_000;
  while (t <= limit && out.length < count) {
    const p: Record<string, number> = {};
    for (const x of fmt.formatToParts(new Date(t))) {
      if (x.type === 'minute') p.minute = Number(x.value);
      else if (x.type === 'hour') p.hour = Number(x.value) % 24;
      else if (x.type === 'day') p.day = Number(x.value);
      else if (x.type === 'month') p.month = Number(x.value);
      else if (x.type === 'weekday') p.dow = DOW.indexOf(x.value.slice(0, 3).toLowerCase());
    }
    const domOk = fdom.any || fdom.values.has(p.day);
    const dowOk = fdow.any || fdow.values.has(p.dow);
    const dayOk = !fdom.any && !fdow.any ? domOk || dowOk : domOk && dowOk;
    if (!(fmon.any || fmon.values.has(p.month)) || !dayOk) {
      t += Math.max(1, 24 * 60 - (p.hour * 60 + p.minute) - 60) * 60_000;
      continue;
    }
    if (!(fh.any || fh.values.has(p.hour))) {
      t += (60 - p.minute) * 60_000;
      continue;
    }
    if (!(fm.any || fm.values.has(p.minute))) {
      t += 60_000;
      continue;
    }
    out.push(new Date(t));
    t += 60_000;
  }
  return out;
}

export function formatRun(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}
