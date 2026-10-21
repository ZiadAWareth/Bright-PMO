import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Wand2, ChevronDown, Loader2, RefreshCw, FlaskConical } from 'lucide-react';
import { pulseService } from './workflowService';

/**
 * Trigger sample-data field for the workflow tester.
 *
 * The record a workflow acts on is an ENTITY ROW, so the sample you design
 * against should be a real one. This offers, in order of fidelity:
 *   1. Load real record — pick an actual row of the target entity (works for
 *      every trigger type; at design time the rows still exist, even for delete).
 *   2. Generate from schema — a schema-accurate sample (correct types/enums)
 *      for when the table is empty; editable in place.
 * The chosen sample is pinned as the tester's trigger data, so downstream step
 * tests run against consistent, real values instead of fabricated JSON.
 */
function recordLabel(r: Record<string, unknown>): string {
  const pick = (k: string) =>
    typeof r[k] === 'string' || typeof r[k] === 'number' ? String(r[k]) : '';
  return (
    pick('name') ||
    pick('title') ||
    pick('label') ||
    pick('email') ||
    pick('reference') ||
    (r.id != null ? '#' + String(r.id) : 'record')
  );
}

export default function TriggerSampleField({
  entity,
  value,
  onChange,
}: {
  entity: string;
  value: string;
  onChange: (json: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  // Track where the current JSON came from, so real vs. fabricated data is explicit.
  const [source, setSource] = useState<'real' | 'generated' | 'edited' | null>(null);

  const {
    data: records = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['pulses', 'sample-records', entity],
    queryFn: () => pulseService.sampleRecords(entity, 10),
    enabled: !!entity,
    staleTime: 30_000,
  });

  const pick = (r: Record<string, unknown>) => {
    onChange(JSON.stringify(r, null, 2));
    setSource('real');
    setOpen(false);
  };

  const generate = async () => {
    if (!entity) return;
    setGenLoading(true);
    setGenError('');
    try {
      const skeleton = await pulseService.sampleSkeleton(entity);
      onChange(JSON.stringify(skeleton, null, 2));
      setSource('generated');
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Could not generate a sample');
    } finally {
      setGenLoading(false);
    }
  };

  const empty = !!entity && !isLoading && records.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Load real record */}
        <div className="relative">
          <button
            type="button"
            disabled={!entity || isLoading}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12.5px] font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5 text-primary" />
            )}
            Load real record
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {open ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute z-50 mt-1 max-h-72 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent {entity || 'records'}
                  </span>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="text-muted-foreground hover:text-foreground"
                    title="Refresh"
                  >
                    <RefreshCw className={'h-3 w-3 ' + (isRefetching ? 'animate-spin' : '')} />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {records.length === 0 ? (
                    <p className="px-2 py-3 text-[12px] text-muted-foreground">No records yet.</p>
                  ) : (
                    records.map((r, i) => (
                      <button
                        key={String(r.id ?? i)}
                        type="button"
                        onClick={() => pick(r)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
                      >
                        <span className="truncate text-[12.5px] text-foreground">{recordLabel(r)}</span>
                        {r.id != null ? (
                          <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted-foreground">
                            #{String(r.id)}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Generate from schema (empty-DB fallback) */}
        <button
          type="button"
          disabled={!entity || genLoading}
          onClick={generate}
          title="Build a schema-accurate sample — use when there are no real records yet"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12.5px] font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
        >
          {genLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5 text-primary" />
          )}
          Generate from schema
        </button>
      </div>

      {empty ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          No {entity} records exist yet — use <span className="font-medium">Generate from schema</span>{' '}
          to build a sample you can edit.
        </p>
      ) : null}
      {genError ? <p className="text-[11px] text-destructive">{genError}</p> : null}

      {value && value.trim() && value.trim() !== '{}' ? (
        source === 'real' ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Database className="h-3.5 w-3.5 shrink-0" /> Real record — from the database
          </p>
        ) : source === 'generated' ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" /> Sample data — schema-generated, not real
          </p>
        ) : source === 'edited' ? (
          <p className="text-[11px] text-muted-foreground">Edited manually</p>
        ) : null
      ) : null}

      <textarea
        rows={8}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSource('edited');
        }}
        placeholder={
          entity
            ? 'Load a real ' + entity + ' record, generate one from the schema, or paste JSON…'
            : 'Set a target entity first, then load or generate a sample.'
        }
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground focus:border-primary/50 focus:outline-none"
      />
    </div>
  );
}
