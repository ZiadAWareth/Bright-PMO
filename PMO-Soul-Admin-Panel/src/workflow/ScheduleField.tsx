import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Code2, Repeat } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * When a scheduled workflow runs, chosen in plain terms instead of typed as cron.
 *
 * Two ways to say it, plus an escape hatch:
 *   • Repeat every   — every N minutes / hours / days
 *   • At set times   — every day, on weekdays, on chosen days of the week, or on a day of the month,
 *                      at a time you pick
 *   • Custom (cron)  — the five-field expression, for anything else
 *
 * The step still stores a cron expression (the scheduler is unchanged); this field writes it, reads
 * an existing one back into the matching choice, and shows the next few times it will run in the
 * schedule's own time zone, with the same rules the server uses.
 */

import {
  DAYS,
  caveat,
  formatRun,
  fromCron,
  nextRuns,
  summarize,
  toCron,
  type Freq,
  type Mode,
  type Model,
  type Unit,
} from './scheduleCron';

// ── component ─────────────────────────────────────────────────────────────────────────────────────

const MODES: Array<{ id: Mode; label: string; Icon: typeof Repeat }> = [
  { id: 'interval', label: 'Repeat every', Icon: Repeat },
  { id: 'times', label: 'At set times', Icon: CalendarClock },
  { id: 'custom', label: 'Custom (cron)', Icon: Code2 },
];

const inputCls =
  'h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ScheduleField({
  value,
  timezone,
  onChange,
}: {
  value: string;
  timezone?: string;
  onChange: (cron: string) => void;
}) {
  const [m, setM] = useState<Model>(() => fromCron(value));
  // Re-read only when the stored value changes from outside (another node, an AI edit, an import).
  const lastWritten = useRef(value);
  useEffect(() => {
    if (value !== lastWritten.current) {
      lastWritten.current = value;
      setM(fromCron(value));
    }
  }, [value]);

  const update = (patch: Partial<Model>) => {
    const next = { ...m, ...patch };
    // Switching to Custom starts from what the other choices produced, so nothing is lost.
    if (patch.mode === 'custom' && m.mode !== 'custom') next.custom = toCron(m);
    setM(next);
    const cron = toCron(next);
    lastWritten.current = cron;
    onChange(cron);
  };

  const tz = (timezone && timezone.trim()) || 'UTC';
  const cron = toCron(m);
  const runs = useMemo(() => nextRuns(cron, tz, 3), [cron, tz]);
  const note = caveat(m);

  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  const onRadioKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const j = (i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length;
    update({ mode: MODES[j].id });
    radios.current[j]?.focus();
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      {/* How to say it */}
      <div role="radiogroup" aria-label="How the schedule is set" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {MODES.map((x, i) => {
          const on = m.mode === x.id;
          return (
            <button
              key={x.id}
              ref={(el) => {
                radios.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => update({ mode: x.id })}
              onKeyDown={(e) => onRadioKey(e, i)}
              className={cn(
                'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <x.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{x.label}</span>
            </button>
          );
        })}
      </div>

      {m.mode === 'interval' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <label htmlFor="sched-every">Every</label>
          <input
            id="sched-every"
            type="number"
            inputMode="numeric"
            min={1}
            max={m.unit === 'minutes' ? 59 : m.unit === 'hours' ? 23 : 31}
            value={m.every}
            onChange={(e) => update({ every: Math.max(1, Number(e.target.value) || 1) })}
            className={cn(inputCls, 'w-20 tabular-nums')}
          />
          <Select value={m.unit} onValueChange={(v) => update({ unit: v as Unit, every: v === 'minutes' ? 15 : 1 })}>
            <SelectTrigger className="h-9 w-32" aria-label="Unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
            </SelectContent>
          </Select>
          {m.unit === 'hours' ? (
            <>
              <label htmlFor="sched-minute">at minute</label>
              <input
                id="sched-minute"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={m.atMinute}
                onChange={(e) => update({ atMinute: Math.min(59, Math.max(0, Number(e.target.value) || 0)) })}
                className={cn(inputCls, 'w-20 tabular-nums')}
              />
            </>
          ) : null}
          {m.unit === 'days' ? (
            <>
              <label htmlFor="sched-time-i">at</label>
              <input id="sched-time-i" type="time" value={m.time} onChange={(e) => e.target.value && update({ time: e.target.value })} className={cn(inputCls, 'w-32')} />
            </>
          ) : null}
        </div>
      ) : null}

      {m.mode === 'times' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <Select value={m.freq} onValueChange={(v) => update({ freq: v as Freq })}>
              <SelectTrigger className="h-9 w-56" aria-label="Which days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                <SelectItem value="days">On chosen days</SelectItem>
                <SelectItem value="monthly">On a day of the month</SelectItem>
              </SelectContent>
            </Select>
            {m.freq === 'monthly' ? (
              <>
                <label htmlFor="sched-dom">on day</label>
                <input
                  id="sched-dom"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={m.dayOfMonth}
                  onChange={(e) => update({ dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                  className={cn(inputCls, 'w-20 tabular-nums')}
                />
              </>
            ) : null}
            <label htmlFor="sched-time">at</label>
            <input id="sched-time" type="time" value={m.time} onChange={(e) => e.target.value && update({ time: e.target.value })} className={cn(inputCls, 'w-32')} />
          </div>
          {m.freq === 'days' ? (
            <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = m.days.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.long}
                    onClick={() => {
                      const days = on ? m.days.filter((x) => x !== d.v) : [...m.days, d.v];
                      update({ days: days.length ? days : m.days }); // at least one day stays chosen
                    }}
                    className={cn(
                      'h-9 min-w-[2.75rem] rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/40',
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          ) : null}
          {m.freq === 'monthly' && m.dayOfMonth > 28 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Months without day {m.dayOfMonth} are skipped.</p>
          ) : null}
        </div>
      ) : null}

      {m.mode === 'custom' ? (
        <div className="space-y-1.5">
          <label htmlFor="sched-cron" className="text-xs font-medium text-foreground">
            Cron expression
          </label>
          <input
            id="sched-cron"
            value={m.custom}
            onChange={(e) => update({ custom: e.target.value })}
            spellCheck={false}
            className={cn(inputCls, 'w-full font-mono')}
            placeholder="0 9 * * 1"
          />
          <p className="text-xs text-muted-foreground">Five fields: minute hour day-of-month month day-of-week. e.g. 0 9 * * 1 is every Monday at 09:00.</p>
        </div>
      ) : null}

      {/* What it means, and when it will next run */}
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs" aria-live="polite">
        {runs === null ? (
          <p className="font-medium text-destructive">This schedule is not valid. Check the cron expression.</p>
        ) : (
          <>
            <p className="font-medium text-foreground">
              {summarize(m)} <span className="font-normal text-muted-foreground">· {tz}</span>
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {runs.length ? 'Next: ' + runs.map((d) => formatRun(d, tz)).join(' · ') : 'Does not run in the next two months.'}
            </p>
          </>
        )}
        {note ? <p className="mt-1 text-amber-700 dark:text-amber-400">{note}</p> : null}
      </div>
    </div>
  );
}

/** Time-zone entry with suggestions from the browser's list and a one-click "use mine". */
export function TimezoneField({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const zones = useMemo<string[]>(() => {
    try {
      return (Intl as any).supportedValuesOf?.('timeZone') ?? [];
    } catch {
      return [];
    }
  }, []);
  const mine = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return '';
    }
  }, []);
  const invalid = useMemo(() => {
    if (!value) return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return false;
    } catch {
      return true;
    }
  }, [value]);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          list="pulse-timezones"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="UTC"
          spellCheck={false}
          aria-invalid={invalid}
          className={cn(inputCls, 'min-w-0 flex-1', invalid && 'border-destructive')}
        />
        {mine && mine !== value ? (
          <button
            type="button"
            onClick={() => onChange(mine)}
            className="h-9 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Use mine ({mine})
          </button>
        ) : null}
      </div>
      <datalist id="pulse-timezones">
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      {invalid ? <p className="text-xs text-destructive">Unknown time zone. Use a name from the list, such as Europe/London.</p> : null}
    </div>
  );
}
