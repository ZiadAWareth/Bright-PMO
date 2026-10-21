import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search } from 'lucide-react';
import { pulseService, type ApiEndpoint } from './workflowService';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-sky-600 dark:text-sky-400',
  POST: 'text-emerald-600 dark:text-emerald-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-rose-600 dark:text-rose-400',
};

/**
 * Build the config patch to apply when an endpoint is picked: it sets the endpoint
 * field to "METHOD /path" and pre-fills the Body / Query mappers with the endpoint's
 * own field/param names — keeping any values the user already mapped for names the
 * newly-picked endpoint still has (so re-picking is idempotent and switching
 * endpoints swaps in the new shape without silently discarding shared mappings).
 */
export function endpointPickPatch(
  ep: ApiEndpoint,
  fieldKey: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { [fieldKey]: `${ep.method} ${ep.path}` };
  if (ep.bodyFields?.length) {
    const prev = (config.body ?? {}) as Record<string, unknown>;
    patch.body = Object.fromEntries(ep.bodyFields.map((k) => [k, prev[k] ?? '']));
  }
  if (ep.queryParams?.length) {
    const prev = (config.query ?? {}) as Record<string, unknown>;
    patch.query = Object.fromEntries(ep.queryParams.map((k) => [k, prev[k] ?? '']));
  }
  return patch;
}

/**
 * Picker over the app's own callable APIs (from the OpenAPI catalog). Selecting an
 * endpoint stores it as "METHOD /path" — e.g. "POST /api/opportunity". When `onPick`
 * is supplied it receives the whole endpoint (so the caller can also scaffold the
 * body/query fields); otherwise `onChange` gets just the "METHOD /path" string.
 */
export default function ApiEndpointField({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (next: string) => void;
  onPick?: (endpoint: ApiEndpoint) => void;
}) {
  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ['pulses', 'api-catalog'],
    queryFn: () => pulseService.apiCatalog(),
    staleTime: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const ql = q.trim().toLowerCase();
  const filtered = endpoints.filter(
    (e) => `${e.method} ${e.path} ${e.tag} ${e.summary}`.toLowerCase().includes(ql),
  );
  const groups = Array.from(new Set(filtered.map((e) => e.tag))).sort();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 text-[13px] text-foreground hover:border-primary/40"
      >
        <span className="truncate font-mono text-[12px]">{value || 'Select an API endpoint…'}</span>
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
                placeholder="Search endpoints (e.g. opportunity)…"
                className="w-full bg-transparent text-[12px] text-foreground outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {isLoading ? (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">Loading endpoints…</p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">No matching endpoints.</p>
              ) : (
                groups.map((tag) => (
                  <div key={tag} className="mb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tag}</p>
                    {filtered
                      .filter((e) => e.tag === tag)
                      .map((e) => (
                        <button
                          key={`${e.method} ${e.path}`}
                          type="button"
                          onClick={() => {
                            if (onPick) onPick(e);
                            else onChange(`${e.method} ${e.path}`);
                            setOpen(false);
                          }}
                          className="flex w-full items-start gap-2 rounded px-2 py-1 text-left hover:bg-accent"
                        >
                          <span className={`w-12 shrink-0 font-mono text-[10.5px] font-bold ${METHOD_COLOR[e.method] ?? 'text-muted-foreground'}`}>
                            {e.method}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[12px] text-foreground">{e.path}</span>
                            {e.summary ? <span className="block truncate text-[11px] text-muted-foreground">{e.summary}</span> : null}
                          </span>
                        </button>
                      ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
