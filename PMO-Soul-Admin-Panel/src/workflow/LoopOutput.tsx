import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, XCircle, Repeat, Flag } from 'lucide-react';

/**
 * The Output pane of a For Each / While step, built like n8n's Loop node: two outputs.
 *
 *   Done — what the loop hands the steps after it once every pass is over: one row per pass,
 *          its item and what the body returned (or why it failed). Later steps read it as
 *          {{results}} (the step's "Results variable").
 *   Loop — what each pass hands the body: the item and index, stepped through pass by pass.
 *
 * Fed with every record the run kept for this step (one per pass, then the finish). A Test step
 * on the loop alone has no passes yet: it previews the items (For Each) or the first check (While).
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

interface Props {
  kind: 'forEach' | 'while';
  /** Every record of this step in the last run, oldest first. */
  runs?: unknown[];
  /** The latest output (a single-step test's preview, or the last record). */
  output: unknown;
  itemVar: string;
  indexVar: string;
  asVar: string;
}

const short = (v: unknown): string => {
  if (v === undefined) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
};

export default function LoopOutput({ kind, runs, output, itemVar, indexVar, asVar }: Props) {
  const records = (runs && runs.length ? runs : [output]).filter(isObj);
  const passes = records.filter((r) => typeof r.pass === 'number');
  const finish = [...records].reverse().find((r) => typeof r.passes === 'number' && Array.isArray(r[asVar] ?? r.results));
  const results = (finish ? ((finish[asVar] ?? finish.results) as unknown[]) : []).filter(isObj);
  const preview = !passes.length && !finish && isObj(output) ? output : null;

  const failed = results.filter((r) => r.error).length;
  const [tab, setTab] = useState<'done' | 'loop'>(finish ? 'done' : 'loop');
  const [at, setAt] = useState(Math.max(0, passes.length - 1));
  const pass = passes[Math.min(at, passes.length - 1)];

  // A single-step test: nothing has looped yet, so say what WOULD happen.
  if (preview) {
    const items = Array.isArray(preview.items) ? preview.items : null;
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2 text-[12px] text-foreground">
          <p className="font-semibold">Preview: this step on its own</p>
          <p className="mt-0.5 text-muted-foreground">
            {kind === 'forEach'
              ? items && items.length
                ? 'It would run its body ' + items.length + ' time' + (items.length === 1 ? '' : 's') + ', once per item below.'
                : 'The collection is empty, so the body would not run: the loop goes straight to Done.'
              : preview.conditionAtStart
                ? 'The condition holds at the start, so the body would run (at most ' + String(preview.maxIterations) + ' times).'
                : 'The condition is false at the start, so the body would not run: the loop goes straight to Done.'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Run the workflow to see every pass and the Done output.</p>
        </div>
        {items && items.length ? (
          <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2 px-2.5 py-1.5 text-[12px]">
                <span className="w-10 shrink-0 tabular-nums text-muted-foreground">Pass {i + 1}</span>
                <code className="min-w-0 break-words font-mono text-[11.5px] text-foreground">
                  {itemVar} = {short(it)}
                </code>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }

  const tabBtn = (id: 'done' | 'loop', label: string, count: string, Icon: typeof Flag) => (
    <button
      type="button"
      role="radio"
      aria-checked={tab === id}
      onClick={() => setTab(id)}
      className={
        'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
        (tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Loop output" className="flex gap-1 rounded-md border border-border bg-muted/60 p-0.5">
        {tabBtn('done', 'Done', finish ? String(results.length) : '–', Flag)}
        {tabBtn('loop', 'Loop', String(passes.length), Repeat)}
      </div>

      {tab === 'done' ? (
        finish ? (
          <div className="space-y-2">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{results.length}</span> pass{results.length === 1 ? '' : 'es'}
              {' · '}
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{results.length - failed} ok</span>
              {failed ? (
                <>
                  {' · '}
                  <span className="tabular-nums text-destructive">{failed} failed</span>
                </>
              ) : null}
              {' · later steps read '}
              <code className="rounded bg-primary/10 px-1 font-mono text-[11px] text-primary">{'{{' + asVar + '}}'}</code>
            </p>
            {results.length ? (
              <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
                {results.map((r, i) => (
                  <ResultRow key={i} r={r} kind={kind} itemVar={itemVar} />
                ))}
              </ol>
            ) : (
              <p className="rounded-md border border-dashed border-border px-2.5 py-3 text-center text-[12px] text-muted-foreground">
                The body never ran, so the list is empty.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border px-2.5 py-3 text-center text-[12px] text-muted-foreground">
            Done fills in once every pass has finished.
          </p>
        )
      ) : passes.length && pass ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-muted-foreground">What the body got on this pass</span>
            <div className="flex items-center gap-1" aria-label="Choose a pass">
              <button
                type="button"
                aria-label="Previous pass"
                disabled={at <= 0}
                onClick={() => setAt((a) => Math.max(0, a - 1))}
                className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[4.5rem] text-center text-[12px] font-medium tabular-nums text-foreground" aria-live="polite">
                Pass {Math.min(at, passes.length - 1) + 1} of {passes.length}
              </span>
              <button
                type="button"
                aria-label="Next pass"
                disabled={at >= passes.length - 1}
                onClick={() => setAt((a) => Math.min(passes.length - 1, a + 1))}
                className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <dl className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
            {(kind === 'forEach' ? [itemVar, indexVar] : [indexVar]).map((k) => (
              <div key={k} className="flex gap-2 px-2.5 py-1.5 text-[12px]">
                <dt className="w-16 shrink-0 font-mono text-primary">{k}</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-words font-mono text-[11.5px] text-foreground">
                  {typeof pass[k] === 'object' ? JSON.stringify(pass[k], null, 2) : short(pass[k])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border px-2.5 py-3 text-center text-[12px] text-muted-foreground">
          No pass ran.
        </p>
      )}
    </div>
  );
}

function ResultRow({ r, kind, itemVar }: { r: Obj; kind: 'forEach' | 'while'; itemVar: string }) {
  const [open, setOpen] = useState(false);
  const err = isObj(r.error) ? r.error : null;
  const index = typeof r.index === 'number' ? r.index : 0;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[12px] hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        {err ? (
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-label="Failed" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Ok" />
        )}
        <span className="w-10 shrink-0 tabular-nums text-muted-foreground">Pass {index + 1}</span>
        <span className="min-w-0 flex-1 break-words font-mono text-[11.5px] text-foreground">
          {kind === 'forEach' ? itemVar + ' = ' + short(r.item) : err ? String(err.message ?? 'Failed') : short(r.output)}
          {kind === 'forEach' && err ? <span className="block font-sans text-destructive">{String(err.message ?? 'Failed')}</span> : null}
        </span>
        <ChevronDown className={'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ' + (open ? 'rotate-180' : '')} aria-hidden />
      </button>
      {open ? (
        <pre className="mx-2.5 mb-2 whitespace-pre-wrap break-words rounded border border-border bg-muted/40 p-2 font-mono text-[11px] text-foreground">
          {JSON.stringify(r, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
