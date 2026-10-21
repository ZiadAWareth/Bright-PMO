import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, User, X, ChevronDown, Braces } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import DataPicker from './DataPicker';
import type { DataStep } from './pulse-data';
import { sourceLabelFor } from './pulse-data';

type Kind = 'variable' | 'role' | 'email';

function parse(value: string): string[] {
  return (value ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}
function classify(raw: string): Kind {
  if (/^\{\{.+\}\}$/.test(raw)) return 'variable';
  if (/^role:/i.test(raw)) return 'role';
  return 'email';
}

const CHIP: Record<Kind, string> = {
  role: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 ring-emerald-600/25',
  variable: 'bg-primary/10 text-primary ring-primary/25',
  email: 'bg-muted text-foreground ring-border',
};

/**
 * Recipient editor for email/notification "to" fields. Each recipient is a chip —
 * a plain email, a {{variable}} (e.g. {{ownerEmail}}), or a `role:` token that the
 * engine expands to every user with that role. A "Roles" dropdown makes picking a
 * role obvious; stored back as a comma-separated string.
 */
export default function PulseRecipientField({
  value,
  onChange,
  steps,
}: {
  value: string;
  onChange: (v: string) => void;
  steps: DataStep[];
}) {
  const tags = parse(value);
  const [draft, setDraft] = useState('');
  const [rolesOpen, setRolesOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);

  // A person is added by EMAIL, which both resolvers (email and in-app notification) accept and
  // which reads as a name on the chip; a numeric id would be opaque and easy to mistype.
  const { data: usersData } = useQuery({
    queryKey: ['users', 'picker'],
    staleTime: 5 * 60_000,
    enabled: peopleOpen,
    queryFn: async () => (await api.get('/api/user', { params: { limit: 200 } })).data,
  });
  const people: Array<{ email: string; name: string }> = (
    (usersData?.data ?? usersData ?? []) as Array<{ email?: string; firstName?: string; lastName?: string }>
  )
    .filter((u) => u && u.email)
    .map((u) => ({ email: String(u.email), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.email) }));

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'list'],
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get('/api/rolesandpermissions', { params: { limit: 100 } })).data,
  });
  const roles: string[] = ((rolesData?.data ?? rolesData ?? []) as Array<{ role: string }>).map((r) => r.role).filter(Boolean);

  const setTags = (next: string[]) => onChange(next.join(', '));
  const add = (raw: string) => {
    const t = raw.trim().replace(/[;,]+$/, '');
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
  };
  const remove = (i: number) => setTags(tags.filter((_, idx) => idx !== i));

  return (
    <div
      className="rounded-md border border-border bg-background p-1.5"
      // A field dragged from the Input pane becomes a recipient taken from the run's data.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const raw = e.dataTransfer.getData('text/plain').trim();
        if (!/^\{\{\s*[\w.]+\s*\}\}$/.test(raw)) return;
        e.preventDefault();
        add(raw);
      }}
    >
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((t, i) => {
          const k = classify(t);
          // A recipient taken from the run's data reads like every other data chip:
          // "<step> · <path>", never the raw {{path}}.
          const path = k === 'variable' ? t.replace(/^\{\{\s*|\s*\}\}$/g, '') : '';
          const from = k === 'variable' ? sourceLabelFor(path, steps) : undefined;
          const label = k === 'role' ? 'role: ' + t.replace(/^role:\s*/i, '') : k === 'variable' ? (from ? from + ' · ' : '') + path : t;
          return (
            <span
              key={`${t}-${i}`}
              title={t}
              className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', CHIP[k])}
            >
              {k === 'role' ? <Users className="h-3 w-3" /> : k === 'variable' ? <Braces className="h-3 w-3" /> : null}
              <span className="max-w-[220px] truncate">{label}</span>
              <button type="button" aria-label="Remove" onClick={() => remove(i)} className="opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
              e.preventDefault();
              add(draft);
              setDraft('');
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft('');
            }
          }}
          placeholder={tags.length ? '' : 'Add an email…'}
          className="min-w-[120px] flex-1 bg-transparent px-1 text-[13px] text-foreground outline-none"
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setRolesOpen((o) => !o)}
            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-background px-2 text-[12px] font-medium text-foreground hover:border-primary/40"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> Add role <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {rolesOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRolesOpen(false)} />
              <div className="absolute z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl">
                {roles.length === 0 ? (
                  <p className="px-2 py-2 text-[12px] text-muted-foreground">No roles found.</p>
                ) : (
                  roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        add(`role:${r}`);
                        setRolesOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12.5px] hover:bg-accent"
                    >
                      <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> {r}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPeopleOpen((o) => !o)}
            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-background px-2 text-[12px] font-medium text-foreground hover:border-primary/40"
          >
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Add person <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {peopleOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPeopleOpen(false)} />
              <div className="absolute z-50 mt-1 max-h-60 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl">
                {people.length === 0 ? (
                  <p className="px-2 py-2 text-[12px] text-muted-foreground">No people found.</p>
                ) : (
                  people.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => {
                        add(u.email);
                        setPeopleOpen(false);
                      }}
                      className="flex w-full flex-col items-start rounded px-2 py-1 text-left text-[12.5px] hover:bg-accent"
                    >
                      <span>{u.name}</span>
                      <span className="text-[11px] text-muted-foreground">{u.email}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <DataPicker steps={steps} onPick={(token) => add(token)} />
        <span className="min-w-0 basis-full px-0.5 text-[11px] leading-snug text-muted-foreground">A role sends to everyone who has it.</span>
      </div>
    </div>
  );
}
