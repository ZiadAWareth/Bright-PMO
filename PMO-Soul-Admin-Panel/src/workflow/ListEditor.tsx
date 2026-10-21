import { useState } from 'react';
import { Plus, X, Code, ArrowUp, ArrowDown } from 'lucide-react';
import TokenInput from './TokenInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DataStep } from './pulse-data';

/**
 * Row editor for an ARRAY-shaped `json` config value (H5): a gateway's `cases`, a
 * switch's `cases`, Transition State's `transitions`, a user task's `form`.
 *
 * The key/value mapper is an OBJECT editor — handed an array it showed nothing and
 * wrote back `{}` on the first keystroke, so the only way to author a branch list
 * was the raw JSON box. Each shape here gets typed columns; anything else gets one
 * JSON-per-row column. The raw JSON toggle stays for power users.
 */

export interface ListColumn {
  key: string;
  label: string;
  type?: 'text' | 'expression' | 'select' | 'boolean';
  options?: string[];
  placeholder?: string;
}

const CASE_SHAPES: Record<string, ListColumn[]> = {
  gateway: [
    { key: 'when', label: 'When', type: 'expression', placeholder: '{{record.amount}} > 1000' },
    { key: 'branch', label: 'Branch', placeholder: 'edge label, e.g. approved' },
  ],
  switch: [
    { key: 'equals', label: 'Equals', placeholder: 'value to match' },
    { key: 'branch', label: 'Branch', placeholder: 'edge label' },
  ],
};

/** The typed columns for a known array field, by config key and pulse type. */
export function listColumnsFor(fieldKey: string, pulseType?: string): ListColumn[] | null {
  if (fieldKey === 'cases') return pulseType === 'control.switch' ? CASE_SHAPES.switch : CASE_SHAPES.gateway;
  if (fieldKey === 'transitions') {
    return [
      { key: 'from', label: 'From', placeholder: 'e.g. draft' },
      { key: 'to', label: 'To', placeholder: 'e.g. submitted' },
    ];
  }
  if (fieldKey === 'form') {
    return [
      { key: 'key', label: 'Key', placeholder: 'e.g. decision' },
      { key: 'label', label: 'Label', placeholder: 'shown to the assignee' },
      { key: 'type', label: 'Type', type: 'select', options: ['text', 'number', 'select', 'boolean'] },
      { key: 'required', label: 'Required', type: 'boolean' },
    ];
  }
  return null;
}

const inputCls =
  'h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

export default function ListEditor({
  value,
  onChange,
  columns,
  steps = [],
  readOnly = false,
  hint,
}: {
  value: unknown;
  onChange: (next: unknown[]) => void;
  /** Typed columns; null renders one JSON-per-row column. */
  columns: ListColumn[] | null;
  /** Earlier steps' data, for the chips in an expression column (a gateway's "When"). */
  steps?: DataStep[];
  readOnly?: boolean;
  /** One plain sentence on how the rows are used (e.g. "the first true case wins"). */
  hint?: string;
}) {
  const rows: unknown[] = Array.isArray(value) ? value : [];
  const [raw, setRaw] = useState(false);
  const [rawText, setRawText] = useState(() => JSON.stringify(rows, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);

  const setRow = (i: number, next: unknown) => onChange(rows.map((r, j) => (j === i ? next : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    const blank: Record<string, unknown> = {};
    for (const c of columns ?? []) blank[c.key] = c.type === 'boolean' ? false : c.type === 'select' ? c.options?.[0] ?? '' : '';
    onChange([...rows, columns ? blank : '']);
  };

  if (raw) {
    return (
      <div>
        <textarea
          rows={6}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
              setRawError(null);
              onChange(parsed);
            } catch (err) {
              setRawError(err instanceof Error ? err.message : 'Invalid JSON');
            }
          }}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground focus:border-primary/50 focus:outline-none"
        />
        {rawError ? <p className="mt-1 text-[11px] text-rose-600">{rawError}</p> : null}
        <button type="button" onClick={() => setRaw(false)} className="mt-1 text-[11px] text-primary hover:underline">
          ← Back to rows
        </button>
      </div>
    );
  }

  // What one row is, in words: a case of a gateway or switch, a transition, a form field.
  const keys = (columns ?? []).map((c) => c.key);
  const noun = keys.includes('when') || keys.includes('equals') ? 'case' : keys.includes('from') ? 'transition' : keys.includes('label') ? 'field' : 'item';
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const valueOf = (obj: Record<string, unknown>, k: string) =>
    obj[k] === undefined || obj[k] === null ? '' : typeof obj[k] === 'string' ? (obj[k] as string) : JSON.stringify(obj[k]);
  const iconBtn =
    'grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-2">
      {hint ? <p className="text-[11.5px] text-muted-foreground">{hint}</p> : null}
      {/* One card per row: its fields get the pane's full width, so a condition with data chips
          reads whole instead of being squeezed beside the branch name and the row buttons. */}
      {rows.map((row, i) => {
        const obj = (row && typeof row === 'object' && !Array.isArray(row) ? row : {}) as Record<string, unknown>;
        return (
          <div key={i} className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {Noun} {i + 1}
              </span>
              <span className="flex-1" />
              {readOnly ? null : (
                <>
                  <button type="button" aria-label={'Move ' + noun + ' ' + (i + 1) + ' up'} disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label={'Move ' + noun + ' ' + (i + 1) + ' down'} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={'Remove ' + noun + ' ' + (i + 1)}
                    onClick={() => remove(i)}
                    className={iconBtn + ' hover:bg-destructive/10 hover:text-destructive'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            {columns ? (
              <div className="grid grid-cols-2 gap-2">
                {columns.map((c) => {
                  const id = 'le-' + i + '-' + c.key;
                  // A condition or a free text field takes the whole width; short values share a line.
                  const wide = c.type === 'expression' || columns.filter((x) => x.type !== 'boolean').length === 1;
                  return (
                    <div key={c.key} className={(wide ? 'col-span-2 ' : '') + 'min-w-0 space-y-1'}>
                      {c.type === 'boolean' ? (
                        <label htmlFor={id} className="flex h-8 items-center gap-2 text-[12px] text-foreground">
                          <input id={id} type="checkbox" checked={Boolean(obj[c.key])} onChange={(e) => setRow(i, { ...obj, [c.key]: e.target.checked })} />
                          {c.label}
                        </label>
                      ) : (
                        <>
                          <label htmlFor={id} className="block text-[11px] font-medium text-muted-foreground">
                            {c.type === 'expression' ? 'When' : c.label}
                          </label>
                          {c.type === 'select' ? (
                            <Select value={String(obj[c.key] ?? '') || undefined} onValueChange={(v) => setRow(i, { ...obj, [c.key]: v })}>
                              <SelectTrigger id={id} className="h-8 text-[13px]">
                                <SelectValue placeholder="Choose…" />
                              </SelectTrigger>
                              <SelectContent className="z-[70]">
                                {(c.options ?? []).map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : c.type === 'expression' ? (
                            // A condition reads data, so it gets the chip field like every other template.
                            <TokenInput
                              value={valueOf(obj, c.key)}
                              onChange={(v) => setRow(i, { ...obj, [c.key]: v })}
                              steps={steps}
                              placeholder={c.placeholder}
                              readOnly={readOnly}
                            />
                          ) : (
                            <input
                              id={id}
                              className={inputCls}
                              placeholder={c.placeholder}
                              value={valueOf(obj, c.key)}
                              onChange={(e) => setRow(i, { ...obj, [c.key]: e.target.value })}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <input
                className={inputCls + ' font-mono text-[12px]'}
                placeholder="value (JSON or text)"
                aria-label={'Item ' + (i + 1)}
                value={typeof row === 'string' ? row : JSON.stringify(row)}
                onChange={(e) => {
                  const text = e.target.value;
                  let parsed: unknown = text;
                  try {
                    parsed = JSON.parse(text);
                  } catch {
                    /* keep as text */
                  }
                  setRow(i, parsed);
                }}
              />
            )}
          </div>
        );
      })}
      {readOnly ? null : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add {noun}
          </button>
          <button
            type="button"
            onClick={() => {
              setRawText(JSON.stringify(rows, null, 2));
              setRawError(null);
              setRaw(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Code className="h-3 w-3" /> Raw JSON
          </button>
        </div>
      )}
    </div>
  );
}
