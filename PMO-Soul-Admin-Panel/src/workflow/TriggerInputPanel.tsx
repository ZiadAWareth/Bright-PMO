import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, CircleDashed, Clock, GitMerge, Loader2, Pencil, Radio, Send, TriangleAlert, UserPlus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pulseService } from './workflowService';
import type { TriggerInputResult, TriggerInputSpec } from './workflowService';
import { callWebhook, exampleBodyText, webhookPathProblem, type WebhookCallResult } from './WebhookField';
import { fromCron, nextRuns, formatRun, summarize } from './scheduleCron';
import { declaredWorkflowInputs, sampleWorkflowInput, typeOfValue } from './workflowInputs';

/**
 * What a trigger that is NOT about a record starts with — a webhook call, a schedule tick, a
 * sign-up — and where the designer gets it from. Never a table row: a real run of these has none.
 *
 *   Real    — the input of this workflow's last real run of the trigger (the server reads it and
 *             replaces secrets). For a webhook this is the active path: call it, and the call shows
 *             up here.
 *   Sample  — what the designer types: an example body, a fire time, a sample person. Kept on the
 *             trigger as config._sample, so Test flow uses the same.
 *
 * Both are shaped on the server by the builder the live entry points use (core/trigger-input).
 */

type Tab = 'real' | 'sample';
type Bag = Record<string, unknown>;

const asBag = (v: unknown): Bag => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : {});

/** "just now", "4 min ago", "3 h ago", or a date. */
export function ago(at: string | Date | undefined | null): string {
  if (!at) return '';
  const t = new Date(at).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const NOUN: Record<string, { one: string; real: string; sample: string; icon: typeof Radio }> = {
  call: { one: 'call', real: 'Real call', sample: 'Example body', icon: Radio },
  clock: { one: 'run', real: 'Real run', sample: 'Pick a time', icon: Clock },
  form: { one: 'sign-up', real: 'Real sign-up', sample: 'Sample person', icon: UserPlus },
  workflow: { one: 'call', real: 'Last call', sample: 'Sample input', icon: GitMerge },
};

const btnPrimary =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const btnOutline =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12.5px] font-medium text-foreground hover:border-primary/40 hover:text-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const inputCls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Two-option switch (radio group, arrow keys move between options). */
function SourceSwitch({ value, onChange, labels, label }: { value: Tab; onChange: (t: Tab) => void; labels: Record<Tab, string>; label: string }) {
  const order: Tab[] = ['real', 'sample'];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = order[(order.indexOf(value) + 1) % 2];
    onChange(next);
    refs.current[order.indexOf(next)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {order.map((t, i) => (
        <button
          key={t}
          ref={(el) => (refs.current[i] = el)}
          type="button"
          role="radio"
          aria-checked={value === t}
          tabIndex={value === t ? 0 : -1}
          onClick={() => onChange(t)}
          className={cn(
            'h-7 rounded-md px-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {labels[t]}
        </button>
      ))}
    </div>
  );
}

/** One step of "how to get real data in here", with its state. */
function Step({ n, done, title, children }: { n: number; done?: boolean; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
          done ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground',
        )}
        aria-hidden
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn('text-[12.5px] font-medium', done ? 'text-muted-foreground' : 'text-foreground')}>
          {title}
          {done ? <span className="sr-only"> (done)</span> : null}
        </p>
        {children}
      </div>
    </li>
  );
}

function Preview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-2 font-mono text-[11px] leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function TriggerInputPanel({
  spec,
  triggerType,
  config,
  onConfigChange,
  workflowId,
  workflowActive,
  readOnly = false,
  mode = 'node',
  onUse,
  usedFrom,
}: {
  spec: TriggerInputSpec;
  triggerType: string;
  config: Bag;
  /** Writes to the trigger's config (the typed sample lives at config._sample). */
  onConfigChange?: (patch: Bag) => void;
  /** The saved workflow; real runs exist only for a saved one. */
  workflowId?: string;
  workflowActive: boolean;
  readOnly?: boolean;
  /** node = the step's Input pane (Simulate); test = the Test dialog (choose what the test starts with). */
  mode?: 'node' | 'test';
  onUse: (res: TriggerInputResult) => void;
  /** Which input is currently in use, to mark it. */
  usedFrom?: 'lastRun' | 'sample' | null;
}) {
  const noun = NOUN[spec.source] ?? NOUN.call;
  const sample = asBag(config._sample);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The last real run of this trigger. A webhook is polled while it can receive calls, so a call
  // made from anywhere shows up here by itself.
  const [tab, setTab] = useState<Tab | null>(null);
  const lastQ = useQuery({
    queryKey: ['trigger-last-run', workflowId, triggerType],
    queryFn: () => pulseService.triggerInput({ workflowId, trigger: { type: triggerType, config }, prefer: 'lastRun' }),
    enabled: !!workflowId,
    // A called workflow runs whether it is active or not (as in n8n), so its last call is watched either way.
    refetchInterval: (workflowActive || spec.source === 'workflow') && (tab ?? 'real') === 'real' ? (spec.source === 'call' ? 4000 : 15000) : false,
  });
  const last = lastQ.data?.from === 'lastRun' ? lastQ.data : null;
  // A webhook opens on its real calls: calling it is how its real data gets here, so those steps
  // come first. The others open on a real run when there is one, else on the sample.
  const shownTab: Tab =
    tab ?? (spec.source === 'call' && mode === 'node' ? 'real' : workflowId && (lastQ.isLoading || last) ? 'real' : 'sample');

  // In the Test dialog the test needs SOME input from the start: the last real one, else the sample.
  const autoPicked = useRef(false);
  useEffect(() => {
    if (mode !== 'test' || autoPicked.current) return;
    if (workflowId && lastQ.isLoading) return;
    autoPicked.current = true;
    if (last) onUse(last);
    else void applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, workflowId, lastQ.isLoading, last]);

  // A NEW call arriving while this is open is loaded straight away (the "listen" journey).
  const seenId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!lastQ.isSuccess) return;
    const id = last?.lastRun?.id ?? null;
    if (seenId.current === undefined) {
      seenId.current = id;
      return;
    }
    if (id && id !== seenId.current) {
      seenId.current = id;
      if (mode === 'node' && last) onUse(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastQ.isSuccess, last?.lastRun?.id]);

  const setSample = (patch: Bag) => {
    const next: Bag = { ...sample, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    onConfigChange?.({ _sample: Object.keys(next).length ? next : undefined });
  };

  // ── sample editors' local state ─────────────────────────────────────────────
  const initialBody = useMemo(() => {
    if (sample.payload !== undefined) return JSON.stringify(sample.payload, null, 2);
    const legacy = String(config.sampleBody ?? '').trim();
    return legacy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [bodyText, setBodyText] = useState(initialBody);
  const bodyProblem = useMemo(() => {
    if (!bodyText.trim()) return null;
    try {
      JSON.parse(bodyText);
      return null;
    } catch {
      return 'Not valid JSON yet — check quotes, commas and brackets.';
    }
  }, [bodyText]);
  const onBody = (text: string) => {
    setBodyText(text);
    if (!text.trim()) setSample({ payload: undefined });
    else
      try {
        setSample({ payload: JSON.parse(text) });
      } catch {
        /* keep typing; saved once it parses */
      }
  };

  // A called workflow's sample input: JSON, starting with an empty value of each declared input.
  const declaredInputs = useMemo(() => declaredWorkflowInputs(config), [config]);
  const initialInput = useMemo(() => {
    if (sample.input !== undefined) return JSON.stringify(sample.input, null, 2);
    return JSON.stringify(sampleWorkflowInput(declaredInputs.fields), null, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [inputText, setInputText] = useState(initialInput);
  // Inputs added, renamed or removed on the trigger show in the sample straight away: values already
  // typed for inputs that stay are kept, a new input starts empty, a removed one goes.
  const declaredKey = declaredInputs.fields.map((f) => f.name + ':' + f.type).join('|');
  const firstDeclared = useRef(true);
  useEffect(() => {
    if (spec.source !== 'workflow') return;
    if (firstDeclared.current) {
      firstDeclared.current = false;
      return;
    }
    const empty = sampleWorkflowInput(declaredInputs.fields);
    let current: Bag = {};
    try {
      current = asBag(JSON.parse(inputText));
    } catch {
      current = asBag(sample.input);
    }
    const next: Bag = {};
    // A typed value is kept only while it still fits its input's type (a number box turned into a
    // list starts again as an empty list).
    const fits = (v: unknown, t: string) => t === 'any' || v === null || typeOfValue(v) === t;
    for (const f of declaredInputs.fields) next[f.name] = f.name in current && fits(current[f.name], f.type) ? current[f.name] : empty[f.name];
    setInputText(JSON.stringify(next, null, 2));
    setSample({ input: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaredKey]);
  const inputProblem = useMemo(() => {
    if (!inputText.trim()) return null;
    try {
      const parsed = JSON.parse(inputText);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? null : 'Give an object, like { "loanId": 1 }.';
    } catch {
      return 'Not valid JSON yet — check quotes, commas and brackets.';
    }
  }, [inputText]);
  const onInput = (text: string) => {
    setInputText(text);
    if (!text.trim()) setSample({ input: undefined });
    else
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) setSample({ input: parsed });
      } catch {
        /* keep typing; saved once it parses */
      }
  };

  const cron = String(config.cron ?? '');
  const tz = String(config.timezone || 'UTC');
  const upcoming = useMemo(() => (cron ? nextRuns(cron, tz, 1)?.[0] ?? null : null), [cron, tz]);
  const scheduleText = useMemo(() => {
    try {
      if (!cron) return '';
      const m = fromCron(cron);
      return m.mode === 'custom' ? 'On the schedule ' + cron : summarize(m);
    } catch {
      return cron;
    }
  }, [cron]);
  const firedAt = typeof sample.firedAt === 'string' ? sample.firedAt : '';
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  const form = spec.form;
  const person = asBag(form ? sample[form.key] : undefined);
  const emailField = form?.fields.find((f) => f.type === 'email');
  const emailValue = emailField ? String(person[emailField.key] ?? '') : '';
  const emailProblem = emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) ? 'Enter an email like name@example.com.' : null;

  const sampleInvalid =
    (spec.source === 'call' && !!bodyProblem) || (spec.source === 'form' && !!emailProblem) || (spec.source === 'workflow' && !!inputProblem);

  // In the Test dialog an edited sample that is in use is applied as you type, so Run Test never
  // starts with an older version of it.
  const sampleKey = JSON.stringify(sample);
  useEffect(() => {
    if (mode !== 'test' || usedFrom !== 'sample' || sampleInvalid) return;
    const t = setTimeout(() => void applySample(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleKey]);

  // ── actions ─────────────────────────────────────────────────────────────────
  async function applySample() {
    setBusy(true);
    setError(null);
    try {
      // Sent as given, so it is used even before the trigger is saved.
      const res = await pulseService.triggerInput({ workflowId, trigger: { type: triggerType, config }, prefer: 'sample', given: sample });
      onUse(res);
    } catch (e) {
      setError('Could not build the sample: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(false);
    }
  }

  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<WebhookCallResult | null>(null);
  const path = String(config.path ?? '');
  const canCall = !!path.trim() && !webhookPathProblem(path);
  const sendCall = async () => {
    setCalling(true);
    setCallResult(null);
    try {
      const r = await callWebhook({
        path,
        method: String(config.method || 'POST'),
        secret: String(config.secret ?? '') || undefined,
        body: exampleBodyText(sample.payload ?? config.sampleBody),
      });
      setCallResult(r);
      await queryClient.invalidateQueries({ queryKey: ['trigger-last-run'] });
    } finally {
      setCalling(false);
    }
  };

  const useLabel = mode === 'test' ? 'Test with this' : 'Use this ' + noun.one;
  const sampleLabel = mode === 'test' ? 'Test with this' : 'Simulate with this';
  const inUse = (from: 'lastRun' | 'sample') => usedFrom === from;

  // ── real ────────────────────────────────────────────────────────────────────
  const realPane = (() => {
    if (!workflowId) {
      return (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
          {spec.source === 'workflow'
            ? 'Save the workflow first. Calls from other workflows are recorded for a saved one.'
            : 'Save the workflow first. Real ' + noun.one + 's are recorded for a saved, active workflow.'}
        </p>
      );
    }
    if (lastQ.isLoading) {
      return (
        <p className="flex items-center gap-2 px-1 py-3 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking for the last real {noun.one}…
        </p>
      );
    }
    const lastData = asBag(last?.data);
    const card = last ? (
      <div className={cn('space-y-2 rounded-lg border p-2.5', inUse('lastRun') ? 'border-primary/50 bg-primary/5' : 'border-border bg-background')}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          {spec.source === 'call' ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">{String(lastData.method ?? '')}</span>
          ) : null}
          <span className="font-medium text-foreground">
            {spec.source === 'call'
              ? 'Call received'
              : spec.source === 'workflow'
                ? 'Called by a workflow'
                : spec.source === 'clock'
                ? 'Fired ' + (lastData.firedAt ? formatRun(new Date(String(lastData.firedAt)), tz) : '')
                : String(asBag(form ? lastData[form.key] : undefined).email || 'Someone') + ' signed up'}
          </span>
          <span className="text-muted-foreground">{ago(last.lastRun?.at)}</span>
          {last.lastRun ? (
            <Link
              to={'/automation/runs/' + last.lastRun.id}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-0.5 text-[11.5px] font-medium text-primary underline-offset-2 hover:underline"
            >
              View run <ArrowUpRight className="h-3 w-3" aria-hidden />
            </Link>
          ) : null}
        </div>
        <Preview value={spec.source === 'call' ? lastData.payload : spec.source === 'workflow' ? lastData.input : form ? lastData[form.key] : lastData} />
        {spec.source === 'form' ? (
          <p className="text-[11px] text-muted-foreground">The password is never shown; a test uses a placeholder that matches none.</p>
        ) : null}
        {readOnly ? null : (
          <button type="button" className={cn(btnPrimary, 'w-full')} onClick={() => onUse(last)}>
            {inUse('lastRun') ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Wand2 className="h-3.5 w-3.5" aria-hidden />}
            {inUse('lastRun') ? 'In use' : useLabel}
          </button>
        )}
      </div>
    ) : null;

    // Status line: is anything going to arrive?
    const status = workflowActive ? (
      <p role="status" className="flex items-center gap-2 text-[12px] font-medium text-primary">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {spec.source === 'call'
          ? last
            ? 'Listening — a new call replaces this one'
            : 'Listening for a call…'
          : spec.source === 'clock'
            ? upcoming
              ? 'Next run ' + formatRun(upcoming, tz)
              : 'Active'
            : 'Active — waiting for a sign-up'}
      </p>
    ) : (
      <p role="status" className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" aria-hidden />
        {spec.source === 'call' ? 'Not listening: the workflow is not active' : 'Not running: the workflow is not active'}
      </p>
    );

    if (spec.source === 'call') {
      return (
        <div className="space-y-3">
          {status}
          {card}
          {last && workflowActive ? null : (
            <ol className="space-y-3" aria-label="How to see a real call here">
              <Step n={1} done={workflowActive} title="Activate the workflow">
                {workflowActive ? null : (
                  <p className="text-[11.5px] text-muted-foreground">Save it, then Activate in the header. Calls to a draft are refused.</p>
                )}
              </Step>
              <Step n={2} done={!!callResult?.ok} title="Call the webhook">
                <p className="text-[11.5px] text-muted-foreground">From your other system (URL under Parameters), or send one from here with the example body.</p>
                {readOnly ? null : (
                  <button type="button" className={btnOutline} onClick={sendCall} disabled={calling || !canCall || !workflowActive}>
                    {calling ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />} Send a test call
                  </button>
                )}
                {!canCall ? <p className="text-[11.5px] text-muted-foreground">Set the path under Parameters first.</p> : null}
                {callResult ? (
                  <p role="status" className={cn('text-[11.5px]', callResult.ok ? 'text-primary' : 'text-destructive')}>
                    {callResult.text}
                  </p>
                ) : null}
              </Step>
              <Step n={3} done={!!last} title="Its data appears here">
                <p className="text-[11.5px] text-muted-foreground">Method, headers, query and body, exactly as the workflow receives them.</p>
              </Step>
            </ol>
          )}
          {last && workflowActive && !readOnly ? (
            <button type="button" className={cn(btnOutline, 'w-full')} onClick={sendCall} disabled={calling || !canCall}>
              {calling ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />} Send another test call
            </button>
          ) : null}
          <p className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11.5px] text-amber-800 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            A real call runs the whole workflow for real: emails, notifications and record changes included.
          </p>
        </div>
      );
    }

    if (spec.source === 'workflow') {
      return (
        <div className="space-y-3">
          <p role="status" className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <GitMerge className="h-3.5 w-3.5" aria-hidden />
            Runs when a Call Workflow step calls it. It does not need to be active.
          </p>
          {card ?? (
            <ol className="space-y-3" aria-label="How to see a real call here">
              <Step n={1} title="Call it from another workflow">
                <p className="text-[11.5px] text-muted-foreground">
                  Add a Call Workflow step there, pick this workflow, and fill its inputs.
                </p>
              </Step>
              <Step n={2} title="Run that workflow">
                <p className="text-[11.5px] text-muted-foreground">What it passed shows up here, exactly as this workflow receives it.</p>
              </Step>
            </ol>
          )}
        </div>
      );
    }

    if (spec.source === 'clock') {
      return (
        <div className="space-y-3">
          {status}
          {card ?? (
            <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
              No scheduled run yet.{' '}
              {workflowActive
                ? upcoming
                  ? 'The first one is ' + formatRun(upcoming, tz) + '; it will show here.'
                  : 'It will show here after the first one.'
                : 'Activate the workflow and the first run will show here' + (upcoming ? ' (' + formatRun(upcoming, tz) + ').' : '.')}{' '}
              Meanwhile, pick a time to try it with.
            </p>
          )}
        </div>
      );
    }

    // form (sign-up)
    return (
      <div className="space-y-3">
        {status}
        {card ?? (
          // Sign-up has no switch of its own: an ACTIVE workflow starting with this trigger IS the
          // switch (auth/register answers 403 without one, and the app contract says signUpEnabled).
          <ol className="space-y-3" aria-label="How to see a real sign-up here">
            <Step n={1} done={workflowActive} title="Activate this workflow">
              <p className="text-[11.5px] text-muted-foreground">
                That is what turns sign-up on: while it is active the app accepts sign-ups, and off it refuses them.
              </p>
            </Step>
            <Step n={2} title="Put a sign-up form on a page">
              <p className="text-[11.5px] text-muted-foreground">
                In{' '}
                <Link to="/design-frontend" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
                  Customer Pages
                </Link>
                , give a page email, first name, last name and password fields, and set its button&apos;s action to{' '}
                <span className="font-medium text-foreground">Sign up (create account)</span>. The button sends them to{' '}
                <code className="rounded bg-muted px-1 font-mono text-[10.5px]">POST /api/auth/register</code>, which starts this workflow.
              </p>
            </Step>
            <Step n={3} title="Sign up on that page">
              <p className="text-[11.5px] text-muted-foreground">Use a private window, since you are signed in here. The sign-up shows up here.</p>
            </Step>
          </ol>
        )}
      </div>
    );
  })();

  // ── sample ──────────────────────────────────────────────────────────────────
  const samplePane = (
    <div className={cn('space-y-3 rounded-lg', inUse('sample') && 'ring-1 ring-primary/40 ring-offset-4 ring-offset-transparent')}>
      {spec.source === 'call' ? (
        <div className="space-y-1.5">
          <label htmlFor="trigger-sample-body" className="block text-[12px] font-medium text-foreground">
            Example body <span className="font-normal text-muted-foreground">(JSON)</span>
          </label>
          <textarea
            id="trigger-sample-body"
            value={bodyText}
            onChange={(e) => onBody(e.target.value)}
            readOnly={readOnly}
            rows={7}
            spellCheck={false}
            placeholder={'{\n  "orderId": 1001,\n  "customer": "Acme"\n}'}
            aria-invalid={!!bodyProblem}
            aria-describedby="trigger-sample-body-help"
            className={cn(
              'w-full resize-y rounded-md border bg-background px-2 py-1.5 font-mono text-[12px] leading-relaxed text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              bodyProblem ? 'border-destructive' : 'border-border',
            )}
          />
          <p id="trigger-sample-body-help" className={cn('text-[11.5px]', bodyProblem ? 'text-destructive' : 'text-muted-foreground')}>
            {bodyProblem ?? 'What a caller would send. Steps read it as {{payload.<field>}}; the test call sends it too.'}
          </p>
        </div>
      ) : null}

      {spec.source === 'workflow' ? (
        <div className="space-y-1.5">
          <label htmlFor="trigger-sample-input" className="block text-[12px] font-medium text-foreground">
            Sample input <span className="font-normal text-muted-foreground">(JSON)</span>
          </label>
          <textarea
            id="trigger-sample-input"
            value={inputText}
            onChange={(e) => onInput(e.target.value)}
            readOnly={readOnly}
            rows={7}
            spellCheck={false}
            placeholder={'{\n  "loanId": 1\n}'}
            aria-invalid={!!inputProblem}
            aria-describedby="trigger-sample-input-help"
            className={cn(
              'w-full resize-y rounded-md border bg-background px-2 py-1.5 font-mono text-[12px] leading-relaxed text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              inputProblem ? 'border-destructive' : 'border-border',
            )}
          />
          <p id="trigger-sample-input-help" className={cn('text-[11.5px]', inputProblem ? 'text-destructive' : 'text-muted-foreground')}>
            {inputProblem ??
              (declaredInputs.mode === 'any'
                ? 'What a calling step would pass. Steps read it as {{input.<name>}}.'
                : 'What a calling step would pass. Only the declared inputs are kept (' +
                  (declaredInputs.fields.map((f) => f.name).join(', ') || 'none yet') +
                  '); steps read them as {{input.<name>}}.')}
          </p>
        </div>
      ) : null}

      {spec.source === 'clock' ? (
        <div className="space-y-2">
          <p className="text-[12px] text-muted-foreground">
            {scheduleText ? (
              <>
                Runs <span className="font-medium text-foreground">{scheduleText.charAt(0).toLowerCase() + scheduleText.slice(1)}</span> ({tz}).{' '}
              </>
            ) : null}
            Pick the moment to pretend it fired; steps read it as <code className="font-mono">{'{{firedAt}}'}</code>.
          </p>
          {readOnly ? null : (
            <div className="flex flex-wrap gap-1.5">
              {upcoming ? (
                <button type="button" className={btnOutline} onClick={() => setSample({ firedAt: upcoming.toISOString() })}>
                  Next run · {formatRun(upcoming, tz)} {tz}
                </button>
              ) : null}
              <button type="button" className={btnOutline} onClick={() => setSample({ firedAt: undefined })}>
                Now
              </button>
            </div>
          )}
          <label htmlFor="trigger-sample-fired" className="block text-[12px] font-medium text-foreground">
            Fired at <span className="font-normal text-muted-foreground">(your local time)</span>
          </label>
          <input
            id="trigger-sample-fired"
            type="datetime-local"
            value={firedAt ? toLocalInput(firedAt) : ''}
            onChange={(e) => setSample({ firedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            readOnly={readOnly}
            className={inputCls}
          />
          <p className="text-[11.5px] text-muted-foreground">{firedAt ? 'Fires at ' + formatRun(new Date(firedAt), tz) + ' (' + tz + ').' : 'Empty: the moment you press the button.'}</p>
        </div>
      ) : null}

      {spec.source === 'form' && form ? (
        <div className="space-y-2">
          {form.fields.map((f) => {
            const id = 'trigger-sample-' + f.key;
            const bad = f.type === 'email' && emailProblem;
            return (
              <div key={f.key} className="space-y-1">
                <label htmlFor={id} className="block text-[12px] font-medium text-foreground">
                  {f.label}
                </label>
                <input
                  id={id}
                  type={f.type === 'email' ? 'email' : 'text'}
                  value={String(person[f.key] ?? '')}
                  placeholder={f.example}
                  onChange={(e) => setSample({ [form.key]: { ...person, [f.key]: e.target.value || undefined } })}
                  readOnly={readOnly}
                  autoComplete="off"
                  aria-invalid={!!bad}
                  aria-describedby={bad ? id + '-err' : undefined}
                  className={cn(inputCls, bad && 'border-destructive')}
                />
                {bad ? (
                  <p id={id + '-err'} className="text-[11.5px] text-destructive">
                    {emailProblem}
                  </p>
                ) : null}
              </div>
            );
          })}
          <p className="text-[11.5px] text-muted-foreground">
            Empty fields use the grey example. No password is asked: a real run gets it already hashed, and a test gets a placeholder that matches none.
          </p>
        </div>
      ) : null}

      {readOnly ? null : (
        <button type="button" className={cn(btnPrimary, 'w-full')} onClick={() => void applySample()} disabled={busy || sampleInvalid}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : inUse('sample') ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          )}
          {inUse('sample') ? 'In use · apply changes' : sampleLabel}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-[11.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
          <noun.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {mode === 'test' ? 'Start the test with' : 'What this trigger starts with'}
        </p>
        <p className="text-[11.5px] text-muted-foreground">
          {spec.source === 'call'
            ? 'A webhook run starts with the call it received, not a record of the table.'
            : spec.source === 'workflow'
              ? 'A called run starts with what the calling step passed, not a record of the table.'
              : spec.source === 'clock'
              ? 'A scheduled run starts with when it fired, not a record of the table.'
              : 'A sign-up run starts with what the person submitted, not a record of the table.'}
        </p>
      </div>
      <SourceSwitch
        value={shownTab}
        onChange={setTab}
        label={'Where the ' + noun.one + ' data comes from'}
        labels={{ real: noun.real, sample: noun.sample }}
      />
      {shownTab === 'real' ? realPane : samplePane}
    </div>
  );
}
