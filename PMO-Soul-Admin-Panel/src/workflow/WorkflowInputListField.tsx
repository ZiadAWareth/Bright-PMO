import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WORKFLOW_INPUT_TYPES, typeOfValue, type WorkflowInputField, type WorkflowInputType } from './workflowInputs';

/**
 * The inputs a "When Called by Another Workflow" trigger declares — ONE list, edited two ways:
 *
 *   Fields — a row per input: its name and its type
 *   JSON   — an example object of what callers pass; its keys are the inputs, typed from the values
 *
 * Switching view never loses anything: the JSON is written from the fields, and a valid JSON edit
 * becomes the fields. The trigger's Input pane sample follows the same list.
 */

const EXAMPLE_VALUE: Record<WorkflowInputType, unknown> = { any: null, string: 'text', number: 0, boolean: false, array: [], object: {} };

function toRows(value: unknown): WorkflowInputField[] {
  return (Array.isArray(value) ? value : []).map((r) => {
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const type = String(row.type ?? 'any') as WorkflowInputType;
    return { name: String(row.name ?? ''), type: (WORKFLOW_INPUT_TYPES as readonly string[]).includes(type) ? type : 'any' };
  });
}

function toExample(rows: WorkflowInputField[]): string {
  const out: Record<string, unknown> = {};
  for (const r of rows) if (r.name.trim()) out[r.name.trim()] = EXAMPLE_VALUE[r.type];
  return JSON.stringify(out, null, 2);
}

const inputCls =
  'h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

export default function WorkflowInputListField({
  value,
  onChange,
  readOnly = false,
}: {
  value: unknown;
  onChange: (rows: WorkflowInputField[]) => void;
  readOnly?: boolean;
}) {
  const rows = toRows(value);
  const [view, setView] = useState<'fields' | 'json'>('fields');
  const [text, setText] = useState(() => toExample(rows));
  const [problem, setProblem] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<WorkflowInputField>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const names = rows.map((r) => r.name.trim());
  const repeated = (n: string) => !!n && names.filter((x) => x === n).length > 1;

  const openJson = () => {
    setText(toExample(rows));
    setProblem(null);
    setView('json');
  };
  const onJson = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setProblem(null);
      onChange([]);
      return;
    }
    try {
      const parsed = JSON.parse(next);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setProblem('Give an object, like { "loanId": 1 }.');
        return;
      }
      setProblem(null);
      onChange(Object.entries(parsed).map(([name, v]) => ({ name, type: typeOfValue(v) })));
    } catch {
      setProblem('Not valid JSON yet — check quotes, commas and brackets.');
    }
  };

  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="Edit the inputs as" className="inline-flex gap-1 rounded-md bg-muted p-0.5">
        {(['fields', 'json'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => (v === 'json' ? openJson() : setView('fields'))}
            className={cn(
              'h-7 rounded px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v === 'fields' ? 'Fields' : 'JSON'}
          </button>
        ))}
      </div>

      {view === 'fields' ? (
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[12px] text-muted-foreground">
              No inputs yet. Callers then pass nothing to this workflow.
            </p>
          ) : (
            rows.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={'Name of input ' + (i + 1)}
                    value={r.name}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                    placeholder="e.g. loanId"
                    readOnly={readOnly}
                    className={cn(inputCls, repeated(r.name.trim()) && 'border-destructive')}
                  />
                  {repeated(r.name.trim()) ? <p className="mt-0.5 text-[11px] text-destructive">Used twice: only the first counts.</p> : null}
                </div>
                <div className="w-32 shrink-0">
                  <Select value={r.type} onValueChange={(t) => setRow(i, { type: t as WorkflowInputType })} disabled={readOnly}>
                    <SelectTrigger className="h-8 w-full text-[13px]" aria-label={'Type of input ' + (i + 1)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {WORKFLOW_INPUT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {readOnly ? null : (
                  <button
                    type="button"
                    aria-label={'Remove input ' + (r.name || i + 1)}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            ))
          )}
          {readOnly ? null : (
            <button
              type="button"
              onClick={() => onChange([...rows, { name: '', type: 'string' }])}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add input
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <textarea
            aria-label="The inputs as a JSON example"
            value={text}
            onChange={(e) => onJson(e.target.value)}
            readOnly={readOnly}
            rows={7}
            spellCheck={false}
            placeholder={'{\n  "loanId": 1,\n  "reason": "text"\n}'}
            aria-invalid={!!problem}
            className={cn(
              'w-full resize-y rounded-md border bg-background px-2 py-1.5 font-mono text-[12px] leading-relaxed text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              problem ? 'border-destructive' : 'border-border',
            )}
          />
          <p className={cn('text-[11px]', problem ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {problem ?? 'Each key is an input, typed from its value (1 → number, "x" → string, true → boolean, [] → array, {} → object, null → any).'}
          </p>
        </div>
      )}
    </div>
  );
}
