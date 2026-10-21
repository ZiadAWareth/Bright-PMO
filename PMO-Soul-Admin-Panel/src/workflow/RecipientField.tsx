import { useState } from 'react';
import { Braces, Users, Plus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { VariableGroup } from './workflow-variables';

export interface RoleOption {
  id: number | string;
  role: string;
}

type Kind = 'variable' | 'role' | 'email';

function classify(raw: string): Kind {
  if (/^\{\{.+\}\}$/.test(raw)) return 'variable';
  if (/^role:/i.test(raw)) return 'role';
  return 'email';
}

/** Split the stored comma/semicolon-separated `to` string into individual tokens. */
function parse(value: string): string[] {
  return (value ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * A chip/tag editor for an email recipient list. Each entry is a tag — a direct
 * email address, a {{variable}} (e.g. {{ownerEmail}}), or a role: token that the
 * engine expands to every user with that role. Stored back as a comma-separated
 * string, so it round-trips with the backend recipient resolver.
 */
export function RecipientField({
  value,
  onChange,
  groups,
  roles,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: VariableGroup[];
  roles: RoleOption[];
}) {
  const tags = parse(value);
  const [draft, setDraft] = useState('');

  const setTags = (next: string[]) => onChange(next.join(', '));
  const add = (raw: string) => {
    const t = raw.trim().replace(/[;,]+$/, '');
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
  };
  const remove = (i: number) => setTags(tags.filter((_, idx) => idx !== i));
  const commitDraft = () => {
    if (draft.trim()) add(draft);
    setDraft('');
  };

  const chipCls = (k: Kind) =>
    k === 'variable'
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20'
      : k === 'role'
        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20'
        : 'bg-muted text-foreground ring-border';

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background p-1.5">
      {tags.map((t, i) => {
        const k = classify(t);
        const label = k === 'role' ? t.replace(/^role:\s*/i, '') : t;
        return (
          <span
            key={`${t}-${i}`}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] ring-1 ${chipCls(k)}`}
            title={t}
          >
            {k === 'variable' && <Braces className="h-3 w-3 shrink-0" />}
            {k === 'role' && <Users className="h-3 w-3 shrink-0" />}
            <span className="max-w-[160px] truncate">{k === 'role' ? `role: ${label}` : label}</span>
            <button type="button" onClick={() => remove(i)} className="opacity-60 hover:opacity-100" aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commitDraft();
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            remove(tags.length - 1);
          }
        }}
        onBlur={commitDraft}
        placeholder={tags.length ? 'Add…' : 'Type an email, or use + for a variable / role'}
        className="min-w-[110px] flex-1 bg-transparent px-1 py-0.5 text-[13px] outline-none placeholder:text-muted-foreground"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Add a variable or role"
            aria-label="Add a variable or role"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Roles</DropdownMenuLabel>
          {roles.length === 0 ? (
            <div className="px-2 py-1 text-[11px] text-muted-foreground">No roles found</div>
          ) : (
            roles.map((r) => (
              <DropdownMenuItem key={String(r.id)} onSelect={() => add(`role:${r.role}`)}>
                <Users className="mr-2 h-3.5 w-3.5 text-violet-500" /> {r.role}
              </DropdownMenuItem>
            ))
          )}
          {groups.map((g) =>
            g.vars.length === 0 ? null : (
              <div key={g.group}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{g.group}</DropdownMenuLabel>
                {g.vars.map((v) => (
                  <DropdownMenuItem key={v.token} onSelect={() => add(v.token)}>
                    <Braces className="mr-2 h-3.5 w-3.5 text-blue-500" />
                    <span className="font-mono text-[12px]">{v.token}</span>
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
