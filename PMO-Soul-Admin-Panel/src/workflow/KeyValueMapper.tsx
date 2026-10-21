import { useEffect, useRef, useState } from 'react';
import { Plus, X, Code } from 'lucide-react';
import DataPicker from './DataPicker';
import TokenInput from './TokenInput';
import type { DataStep } from './pulse-data';

type Row = { k: string; v: string };

const inputCls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

function toRows(value: unknown): Row[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
      k,
      v: typeof v === 'string' ? v : JSON.stringify(v),
    }));
  }
  return [];
}

function toObject(rows: Row[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { k, v } of rows) {
    if (!k.trim()) continue;
    // Keep {{templates}} and plain strings as strings; parse literals (numbers,
    // booleans, arrays, objects) when they are valid JSON.
    if (/\{\{.*\}\}/.test(v)) out[k] = v;
    else {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

/**
 * Field-by-field editor for an object config value (e.g. Create Record's data,
 * HTTP headers/body). Each value can be a literal or a {{reference}} picked from a
 * previous step — no hand-written JSON. A raw-JSON escape hatch remains for power
 * users.
 */
export default function KeyValueMapper({
  value,
  onChange,
  steps,
  readOnly = false,
}: {
  value: unknown;
  onChange: (next: Record<string, unknown>) => void;
  steps: DataStep[];
  readOnly?: boolean;
}) {
  // An array is not this editor's shape (see ListEditor). Handed one anyway, stay in the raw
  // JSON view: the field view would list nothing and write back {} on the first keystroke.
  const isArray = Array.isArray(value);
  const [raw, setRaw] = useState(isArray);
  const [rawText, setRawText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  // The rows live HERE, not only in the saved value: a new row has no name yet, and the saved
  // object cannot hold a nameless key — rebuilt from it, "Add field" added a row that vanished.
  const [rows, setRows] = useState<Row[]>(() => toRows(value));
  const sent = useRef(JSON.stringify(value ?? {}));
  useEffect(() => {
    // Changed from outside (Raw JSON, undo, another node opened): take it.
    const now = JSON.stringify(value ?? {});
    if (now !== sent.current) {
      sent.current = now;
      setRows(toRows(value));
    }
  }, [value]);

  const commit = (next: Row[]) => {
    setRows(next);
    const obj = toObject(next);
    sent.current = JSON.stringify(obj);
    onChange(obj);
  };

  if (raw) {
    return (
      <div>
        <textarea
          rows={5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              /* keep editing until valid */
            }
          }}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground focus:border-primary/50 focus:outline-none"
        />
        {isArray ? (
          <p className="mt-1 text-[11px] text-muted-foreground">This value is a list; edit it as JSON.</p>
        ) : (
          <button type="button" onClick={() => setRaw(false)} className="mt-1 text-[11px] text-primary hover:underline">
            ← Back to fields
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        // Two lines per field: its name, then its value at full width, so data chips read whole
        // instead of breaking mid-word in a narrow column.
        <div key={i} className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2">
          <div className="flex items-center gap-1.5">
            <input
              className={inputCls + ' font-medium'}
              placeholder="field name"
              aria-label={'Field ' + (i + 1) + ' name'}
              value={row.k}
              readOnly={readOnly}
              onChange={(e) => {
                const next = rows.slice();
                next[i] = { ...row, k: e.target.value };
                commit(next);
              }}
            />
            {readOnly ? null : (
            <button
              type="button"
              aria-label={'Remove field ' + (row.k || i + 1)}
              onClick={() => commit(rows.filter((_, j) => j !== i))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            )}
          </div>
          {/* The value is the same chip field as every other text setting: {{data}} shows as a
              labelled chip, dragged in from the Input pane or picked with { }. */}
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <TokenInput
                value={row.v}
                onChange={(v) => {
                  const next = rows.slice();
                  next[i] = { ...row, v };
                  commit(next);
                }}
                steps={steps}
                placeholder="value, or drag data in"
                readOnly={readOnly}
              />
            </div>
            {readOnly ? null : (
            <DataPicker
              steps={steps}
              onPick={(token) => {
                const next = rows.slice();
                next[i] = { ...row, v: (row.v ?? '') + token };
                commit(next);
              }}
            />
            )}
          </div>
        </div>
      ))}
      {readOnly ? (
        rows.length ? null : <p className="text-[12px] text-muted-foreground">No fields.</p>
      ) : (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => commit([...rows, { k: '', v: '' }])}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add field
        </button>
        <button
          type="button"
          onClick={() => {
            setRawText(JSON.stringify(value ?? {}, null, 2));
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
