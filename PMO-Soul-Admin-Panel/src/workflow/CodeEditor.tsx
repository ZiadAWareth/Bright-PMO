import { useEffect, useMemo, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap, placeholder as placeholderExt } from '@codemirror/view';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { acceptCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { Braces } from 'lucide-react';
import type { DataStep } from './pulse-data';
import { previewValue } from './pulse-data';

/**
 * The Run JavaScript editor (n8n's Code node, adapted to this engine): real JavaScript editing,
 * and the run's data in plain sight.
 *
 *   - `vars.` autocompletes from what the steps BEFORE this one actually produced (their last test
 *     output), with a sample value and the step it came from — n8n's `$` suggestions.
 *   - "Available in vars" lists those variables; clicking one inserts it at the cursor.
 *   - A field dragged from the Input pane drops in as `vars.path.to.field`, not a {{template}}.
 *
 * The code runs server-side as `function (vars, console) { … }` (run-code.executor.ts).
 */

type Bag = Record<string, unknown>;

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** a.b.0.c-d → vars.a.b[0]["c-d"] */
export function toVarsPath(path: string): string {
  return (
    'vars' +
    path
      .split('.')
      .filter(Boolean)
      .map((seg) => (IDENT.test(seg) ? '.' + seg : /^\d+$/.test(seg) ? '[' + seg + ']' : '[' + JSON.stringify(seg) + ']'))
      .join('')
  );
}

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v === 'object' ? 'object' : typeof v);

/**
 * The variables a step can read, by name, with the step each came from. A trigger also spreads its
 * record's fields at the top level (as the engine does); those duplicates are left out here so the
 * list shows `record` once rather than every column twice.
 */
export function availableVars(steps: DataStep[]): Array<{ key: string; value: unknown; from: string }> {
  const out = new Map<string, { key: string; value: unknown; from: string }>();
  for (const s of steps) {
    const o = s.output;
    if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
    const rec = (o as Bag).record && typeof (o as Bag).record === 'object' ? ((o as Bag).record as Bag) : null;
    for (const [k, v] of Object.entries(o as Bag)) {
      if (k.startsWith('$')) continue;
      if (rec && k !== 'record' && k in rec) continue;
      out.set(k, { key: k, value: v, from: s.label });
    }
  }
  return [...out.values()];
}

// Colours from the app's own tokens, so the editor follows light and dark mode.
const theme = EditorView.theme({
  '&': {
    fontSize: '12.5px',
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    borderRadius: '0.375rem',
    border: '1px solid hsl(var(--border))',
  },
  '&.cm-focused': { outline: 'none', borderColor: 'hsl(var(--primary) / 0.5)' },
  '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', caretColor: 'hsl(var(--primary))', padding: '6px 0' },
  '.cm-scroller': { minHeight: '220px', maxHeight: '420px', overflow: 'auto', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'hsl(var(--muted) / 0.4)', color: 'hsl(var(--muted-foreground))', border: 'none', borderRight: '1px solid hsl(var(--border))' },
  '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.35)' },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted) / 0.6)', color: 'hsl(var(--foreground))' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'hsl(var(--primary) / 0.18) !important' },
  '.cm-cursor': { borderLeftColor: 'hsl(var(--primary))' },
  '.cm-matchingBracket': { backgroundColor: 'hsl(var(--primary) / 0.15)', outline: '1px solid hsl(var(--primary) / 0.4)' },
  '.cm-placeholder': { color: 'hsl(var(--muted-foreground))' },
  '.cm-tooltip': { backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '3px 8px', fontFamily: 'ui-monospace, monospace', fontSize: '12px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--foreground))' },
  '.cm-completionDetail': { color: 'hsl(var(--muted-foreground))', fontStyle: 'normal', marginLeft: '8px' },
  '.cm-completionInfo': { padding: '6px 8px', fontSize: '11.5px', maxWidth: '320px' },
  '.cm-foldPlaceholder': { backgroundColor: 'hsl(var(--muted))', border: 'none', color: 'hsl(var(--muted-foreground))' },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'hsl(var(--primary))', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: '#059669' },
  { tag: [t.number, t.bool, t.null], color: '#b45309' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' },
  { tag: [t.propertyName], color: 'hsl(var(--foreground))' },
  { tag: [t.variableName], color: 'hsl(var(--foreground))' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#0e7490' },
  { tag: [t.punctuation, t.bracket, t.operator], color: 'hsl(var(--muted-foreground))' },
]);

export default function CodeEditor({
  value,
  onChange,
  steps,
  readOnly = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  steps: DataStep[];
  readOnly?: boolean;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editable = useRef(new Compartment());

  const vars = useMemo(() => availableVars(steps), [steps]);
  const varsRef = useRef(vars);
  varsRef.current = vars;

  // vars.<path> completion from the real data the earlier steps produced.
  const complete = (ctx: CompletionContext) => {
    const m = ctx.matchBefore(/\bvars(?:\.[A-Za-z_$][\w$]*|\[\d+\])*\.?[A-Za-z_$]*$/);
    if (m) {
      const text = m.text;
      const lastDot = text.lastIndexOf('.');
      if (lastDot === -1) return null;
      const parentPath = text.slice(5, lastDot); // after "vars."
      const from = m.from + lastDot + 1;
      let node: unknown = Object.fromEntries(varsRef.current.map((v) => [v.key, v.value]));
      for (const seg of parentPath.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)) {
        node = node && typeof node === 'object' ? (node as Bag)[seg] : undefined;
      }
      if (!node || typeof node !== 'object') return null;
      const top = parentPath === '';
      const options: Completion[] = Object.entries(node as Bag)
        .filter(([k]) => IDENT.test(k))
        .map(([k, v]) => ({
          label: k,
          type: typeOf(v) === 'object' || typeOf(v) === 'list' ? 'namespace' : 'property',
          detail: typeOf(v) === 'object' ? '{…}' : typeOf(v) === 'list' ? '[' + (v as unknown[]).length + ']' : previewValue(v),
          info: top ? 'From ' + (varsRef.current.find((x) => x.key === k)?.from ?? 'an earlier step') : undefined,
          boost: top ? 1 : 0,
        }));
      return { from, options, validFor: /^[\w$]*$/ };
    }
    const w = ctx.matchBefore(/[A-Za-z_$][\w$]*$/);
    if (!w || (w.from === w.to && !ctx.explicit)) return null;
    return {
      from: w.from,
      options: [
        { label: 'vars', type: 'variable', detail: 'the data from earlier steps', boost: 2 },
        { label: 'console', type: 'variable', detail: 'console.log shows in Output', boost: 1 },
        { label: 'return', type: 'keyword', detail: '{ key: value } becomes variables' },
      ],
    };
  };
  const completeRef = useRef(complete);
  completeRef.current = complete;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value ?? '',
        extensions: [
          basicSetup,
          javascript(),
          javascriptLanguage.data.of({ autocomplete: (c: CompletionContext) => completeRef.current(c) }),
          keymap.of([{ key: 'Tab', run: acceptCompletion }]),
          syntaxHighlighting(highlight),
          theme,
          EditorView.lineWrapping,
          placeholder ? placeholderExt(placeholder) : [],
          editable.current.of([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
          // A field dragged from the Input pane arrives as {{path}}: in code it is vars.path.
          EditorView.domEventHandlers({
            drop: (e, ev) => {
              const raw = e.dataTransfer?.getData('text/plain') ?? '';
              const m = /^\{\{\s*([\w.$-]+)\s*\}\}$/.exec(raw.trim());
              if (!m || ev.state.readOnly) return false;
              e.preventDefault();
              const pos = ev.posAtCoords({ x: e.clientX, y: e.clientY }) ?? ev.state.selection.main.head;
              const text = toVarsPath(m[1]);
              ev.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
              ev.focus();
              return true;
            },
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // Built once; value and readOnly are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside changes (another step opened, an undo from elsewhere) replace the text.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const now = v.state.doc.toString();
    if ((value ?? '') !== now) v.dispatch({ changes: { from: 0, to: now.length, insert: value ?? '' } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]),
    });
  }, [readOnly]);

  const insert = (text: string) => {
    const v = view.current;
    if (!v || readOnly) return;
    const { from, to } = v.state.selection.main;
    v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    v.focus();
  };

  return (
    <div className="space-y-2">
      <div ref={host} className={readOnly ? 'opacity-90' : undefined} />
      <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Braces className="h-3.5 w-3.5" aria-hidden /> Available in vars
        </p>
        {vars.length === 0 ? (
          <p className="text-[11.5px] text-muted-foreground">
            Run Test flow (or Simulate the trigger) to see what the earlier steps hand this one. Type <code className="font-mono">vars.</code> for suggestions.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {vars.map((v) => (
              <button
                key={v.key}
                type="button"
                disabled={readOnly}
                onClick={() => insert(toVarsPath(v.key))}
                title={'From ' + v.from + ' · ' + (typeOf(v.value) === 'object' ? 'object' : previewValue(v.value))}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11.5px] text-primary ring-1 ring-inset ring-primary/25 hover:bg-primary/15 disabled:cursor-default disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{toVarsPath(v.key)}</span>
                <span className="shrink-0 font-sans text-[10.5px] text-muted-foreground">{v.from}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Type <code className="font-mono">vars.</code> for suggestions, or drag a field from the Input pane. Whatever you <code className="font-mono">return</code> becomes variables for the next steps.
        </p>
      </div>
    </div>
  );
}
