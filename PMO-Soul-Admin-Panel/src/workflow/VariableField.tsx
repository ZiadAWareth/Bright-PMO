import { useRef } from 'react';
import { Braces } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { VariableGroup } from './workflow-variables';

/**
 * A text field (single- or multi-line) with an "insert variable" picker, à la
 * n8n / ActivePieces. The picker lists every variable available to this node —
 * trigger record fields, engine values, and upstream step outputs — and inserts
 * the chosen {{token}} at the caret, so the user never has to hand-type or guess
 * where a value like {{email}} comes from.
 */
export function VariableField({
  value,
  onChange,
  groups,
  multiline,
  rows = 4,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: VariableGroup[];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const insert = (token: string) => {
    const el = ref.current;
    const current = value ?? '';
    // Insert at the caret when we have one; otherwise append.
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    onChange(next);
    // Restore focus + place the caret just after the inserted token.
    const caret = start + token.length;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      try { el.setSelectionRange(caret, caret); } catch { /* number inputs etc. */ }
    });
  };

  const hasVars = groups.some((g) => g.vars.length > 0);

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          rows={rows}
          className={`pr-9 ${mono ? 'font-mono text-xs' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          ref={ref as React.RefObject<HTMLInputElement>}
          className={`pr-9 ${mono ? 'font-mono text-xs' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Insert a variable"
            aria-label="Insert a variable"
            disabled={!hasVars}
            className={`absolute right-1.5 ${multiline ? 'top-1.5' : 'top-1/2 -translate-y-1/2'} grid h-6 w-6 place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40`}
          >
            <Braces className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
          {groups.map((g, gi) =>
            g.vars.length === 0 ? null : (
              <div key={g.group}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </DropdownMenuLabel>
                {g.vars.map((v) => (
                  <DropdownMenuItem
                    key={v.token}
                    onSelect={() => insert(v.token)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono text-[12px] text-foreground">{v.token}</span>
                      {v.sample !== undefined && (
                        <span className="max-w-[120px] truncate rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400" title={v.sample}>
                          {v.sample}
                        </span>
                      )}
                    </div>
                    {v.hint && <span className="text-[10.5px] text-muted-foreground">{v.hint}</span>}
                  </DropdownMenuItem>
                ))}
              </div>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
