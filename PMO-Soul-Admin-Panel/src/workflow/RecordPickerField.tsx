import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, X, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * The picker behind the `agentPicker` and `userPicker` widgets (plan 3.6).
 *
 * One component rather than two files because the two are the same thing: fetch a list, search it,
 * store the picked row's id. Only the endpoint and the two label lines differ, and those fit in the
 * table below.
 *
 * Why a picker at all, for `runAs` especially: that field decides WHOSE PERMISSIONS the agent works
 * under. Typed by hand, `7` instead of `17` runs the agent as a different person — silently, and
 * with a plausible-looking result. A list makes that mistake require picking the wrong name, which
 * is a mistake you can see.
 */

interface Row {
  id: string;
  primary: string;
  secondary: string;
}

interface SourceSpec {
  queryKey: string[];
  load: () => Promise<Row[]>;
  placeholder: string;
  searchHint: string;
  /** Shown when the list comes back empty — says what to do, not just that it is empty. */
  emptyHint: string;
  /** Shown when the list could not be read at all, which is nearly always a missing permission. */
  deniedHint: string;
  /** Whether the field may legitimately be left unset. */
  clearable: boolean;
}

/** Both list endpoints may answer as a bare array or as a `{ data: [...] }` envelope. */
function rowsOf(body: unknown): Record<string, unknown>[] {
  const envelope = body as { data?: unknown } | undefined;
  const list = Array.isArray(body) ? body : Array.isArray(envelope?.data) ? envelope.data : [];
  return list as Record<string, unknown>[];
}

const SOURCES: Record<string, SourceSpec> = {
  agent: {
    // Its OWN cache key. ['agent', 'agents'] holds the Agents page's raw rows; sharing it, this
    // picker read those rows (no `primary`) from the cache and showed blank options. Still under
    // ['agent', 'agents'], so saving or deleting an agent refreshes this list as well.
    queryKey: ['agent', 'agents', 'picker'],
    load: async () =>
      rowsOf((await api.get('/api/agent/agents')).data).map((r) => ({
        id: String(r.id ?? ''),
        primary: String(r.name ?? r.id ?? ''),
        secondary: String(r.role ?? ''),
      })),
    placeholder: 'Select an agent…',
    searchHint: 'Search agents…',
    emptyHint: 'No agents yet. Create one on the Agents page, then come back.',
    deniedHint: 'Could not read the agent list. Sign in again, or ask an administrator.',
    clearable: false,
  },
  user: {
    // Not ['users', 'picker']: the recipient field caches the RAW user list there, and each read
    // the other's shape from the cache (blank people / blank Run as).
    queryKey: ['users', 'picker', 'options'],
    load: async () =>
      rowsOf((await api.get('/api/user', { params: { limit: 200 } })).data).map((r) => ({
        id: String(r.id ?? ''),
        primary: [r.firstName, r.lastName].filter(Boolean).join(' ') || String(r.email ?? r.id ?? ''),
        secondary: String(r.email ?? ''),
      })),
    placeholder: 'Whoever triggers the workflow',
    searchHint: 'Search people by name or email…',
    emptyHint: 'No people found.',
    deniedHint:
      'You do not have permission to list people (User \u2192 list). Ask an administrator to set Run as.',
    clearable: true,
  },
};

export default function RecordPickerField({
  source,
  value,
  onChange,
}: {
  source: 'agent' | 'user';
  value: string;
  onChange: (next: string) => void;
}) {
  const spec = SOURCES[source];
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: spec.queryKey,
    queryFn: spec.load,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = rows.find((r) => r.id === value);
  // A stored id that is not in the list means the row was deleted, or the list was truncated.
  // Showing the placeholder here would read as "nothing is set", when in fact something IS set
  // and is broken — so show the raw id and say so.
  const dangling = Boolean(value) && !selected && !isLoading;

  const ql = q.trim().toLowerCase();
  const filtered = rows.filter((r) => `${r.primary} ${r.secondary}`.toLowerCase().includes(ql));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 text-[13px] text-foreground hover:border-primary/40"
      >
        {selected ? (
          <span className="min-w-0 truncate">
            {selected.primary}
            {selected.secondary ? <span className="text-muted-foreground"> · {selected.secondary}</span> : null}
          </span>
        ) : dangling ? (
          <span className="flex min-w-0 items-center gap-1 truncate text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono text-[12px]">{value}</span>
            <span className="shrink-0">— not found</span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">{spec.placeholder}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={spec.searchHint}
                className="w-full bg-transparent text-[12px] text-foreground outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {spec.clearable && value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-muted-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" /> Clear — {spec.placeholder.toLowerCase()}
                </button>
              ) : null}
              {isLoading ? (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">Loading…</p>
              ) : isError ? (
                // Usually a 403: `/api/user` needs the User→list permission. Saying "none found"
                // here would blame the data for what is a permission problem.
                <p className="px-2 py-3 text-[12px] text-amber-600 dark:text-amber-400">
                  {spec.deniedHint}
                </p>
              ) : rows.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">{spec.emptyHint}</p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">Nothing matches “{q}”.</p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onChange(r.id);
                      setOpen(false);
                    }}
                    className="flex w-full flex-col items-start rounded px-2 py-1 text-left hover:bg-accent"
                  >
                    <span className="w-full truncate text-[12.5px] text-foreground">{r.primary}</span>
                    {r.secondary ? (
                      <span className="w-full truncate text-[11px] text-muted-foreground">{r.secondary}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
