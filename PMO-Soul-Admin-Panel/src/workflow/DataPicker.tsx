import { useEffect, useState } from 'react';
import { Braces, Search, SearchX, ChevronRight, ChevronDown, Database } from 'lucide-react';
import type { DataStep } from './pulse-data';
import { previewValue, subtreeMatches } from './pulse-data';

/**
 * Activepieces-style data selector. Opens as a large floating panel to the LEFT
 * of the properties sidebar with a search box and, per previous step, a recursive
 * collapsible JSON tree of its output. Clicking a leaf inserts its `{{path}}`
 * reference; clicking a branch expands it. Search auto-expands matches.
 */
export default function DataPicker({
  steps,
  onPick,
}: {
  steps: DataStep[];
  onPick: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const q = term.trim().toLowerCase();

  const insert = (path: string) => {
    onPick(`{{${path}}}`);
    setOpen(false);
    setTerm('');
  };

  const visibleSteps = steps.filter((s) => subtreeMatches(s.output, '', q));

  return (
    <>
      <button
        type="button"
        title="Insert data from a previous step"
        aria-label="Insert data from a previous step"
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        <Braces className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-[21rem] top-[76px] bottom-4 z-50 flex w-[380px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Database className="h-4 w-4 text-primary" />
              <p className="text-[13px] font-semibold text-foreground">Insert data</p>
              <span className="ml-auto text-[11px] text-muted-foreground">from previous steps</span>
            </div>

            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search fields across steps…"
                className="w-full bg-transparent text-[13px] text-foreground outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {steps.length === 0 ? (
                <Empty
                  title="No data yet"
                  hint="Run Test flow, then pick from any previous step's output."
                />
              ) : visibleSteps.length === 0 ? (
                <Empty title="No matching data" hint="Try adjusting your search." />
              ) : (
                visibleSteps.map((s) => <StepSection key={s.nodeId} step={s} term={q} onInsert={insert} />)
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <SearchX className="h-6 w-6 text-muted-foreground/60" />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function StepSection({ step, term, onInsert }: { step: DataStep; term: string; onInsert: (path: string) => void }) {
  const entries = step.output && typeof step.output === 'object' ? Object.entries(step.output as Record<string, unknown>) : [];
  return (
    <div className="mb-2">
      <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-card px-1 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{step.label}</span>
      </div>
      <div className="pl-1">
        {entries.map(([k, v]) => (
          <TreeNode key={k} name={k} value={v} path={k} depth={0} term={term} onInsert={onInsert} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  name,
  value,
  path,
  depth,
  term,
  onInsert,
}: {
  name: string;
  value: unknown;
  path: string;
  depth: number;
  term: string;
  onInsert: (path: string) => void;
}) {
  const isBranch = value !== null && typeof value === 'object';
  const [expanded, setExpanded] = useState(depth < 1);

  useEffect(() => {
    if (term) setExpanded(true);
  }, [term]);

  if (term && !subtreeMatches(value, path, term)) return null;

  const indent = { paddingLeft: `${depth * 14 + 4}px` };

  if (!isBranch) {
    return (
      <button
        type="button"
        onClick={() => onInsert(path)}
        style={indent}
        className="flex w-full items-center justify-between gap-2 rounded py-1 pr-2 text-left hover:bg-accent"
      >
        <span className="truncate font-mono text-[12px] text-foreground">{name}</span>
        <span className="shrink-0 truncate text-[11px] text-muted-foreground">{previewValue(value)}</span>
      </button>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const badge = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

  return (
    <div>
      <div style={indent} className="flex items-center gap-1 rounded py-1 pr-2 hover:bg-accent/60">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onInsert(path)}
          title="Insert this object"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="truncate font-mono text-[12px] font-medium text-foreground">{name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{badge}</span>
        </button>
      </div>
      {expanded ? (
        <div>
          {entries.map(([k, v]) => (
            <TreeNode key={k} name={k} value={v} path={`${path}.${k}`} depth={depth + 1} term={term} onInsert={onInsert} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
