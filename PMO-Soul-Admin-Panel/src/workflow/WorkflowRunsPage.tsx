import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import workflowService from './workflowService';

/**
 * Runs & Incidents (Wave D).
 *
 * Opens on All runs: every run, newest first, with filters. Incidents is the same list cut down to
 * runs that failed or were interrupted. Laid out like every other list screen in the app (title
 * and count, toolbar, cards on phones, a table on wider screens, numbered pages).
 *
 * A run opens on its own page (WorkflowRunDetailPage) with every step's input, output and error;
 * Cancel and Retry live there.
 */

// The run row's own enum: a parked run is PAUSED in the database (the engine calls it WAITING).
const STATUSES = ['', 'FAILED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;
const PAGE_SIZE = 25;

const isWaiting = (status?: string) => status === 'PAUSED' || status === 'WAITING';
/** Radix Select cannot hold an empty value, so "any" stands for "no filter". */
const ANY = 'any';

export function statusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (String(status || '').toUpperCase()) {
    case 'FAILED':
      return 'destructive';
    case 'COMPLETED':
      return 'default';
    case 'RUNNING':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * What a status means to a person. A parked run is not "paused" by anyone — it is waiting for a
 * person (a task in someone's inbox) or for a timer; the step it parked at says which. The step
 * itself is WAITING (not COMPLETED) until that person or timer settles it.
 */
export function statusLabel(status?: string, parkedPulseType?: string | null): string {
  const s = String(status || '').toUpperCase();
  if (isWaiting(s)) {
    if (!parkedPulseType) return 'Waiting';
    return String(parkedPulseType).startsWith('time.') ? 'Waiting for a timer' : 'Waiting for a person';
  }
  return s;
}

/** The status badge; a waiting run or step gets its own amber look so it reads as "someone's turn". */
export function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const waiting = isWaiting(String(status || '').toUpperCase());
  return (
    <Badge
      variant={statusVariant(status)}
      className={waiting ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : undefined}
    >
      {label ?? statusLabel(status)}
    </Badge>
  );
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/** What set a run off, in words (WorkflowRun.triggerEvent). */
const TRIGGER_LABELS: Record<string, string> = {
  onCreate: 'Record created',
  onUpdate: 'Record updated',
  onDelete: 'Record deleted',
  manualStart: 'Started by hand',
  scheduled: 'Schedule',
  webhook: 'Webhook',
  signUp: 'Sign-up',
  subWorkflow: 'Called by a workflow',
};
const triggerLabel = (e?: string | null) => (e ? TRIGGER_LABELS[e] ?? e : '—');

/** Page numbers with ellipses, as on every other list screen. */
function pageWindow(current: number, count: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= count; p++) {
    if (p === 1 || p === count || (p >= current - 1 && p <= current + 1)) pages.push(p);
    else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  }
  return pages;
}

export default function WorkflowRunsPage() {
  // All runs is what people open the page for; Incidents narrows it to what needs attention.
  const [tab, setTab] = useState<'all' | 'incidents'>('all');
  const [status, setStatus] = useState<string>('');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  // Older links (the task console) point at /automation/runs?runId=…; the run now has its own page.
  const [searchParams] = useSearchParams();
  const legacyRunId = searchParams.get('runId');

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.list(),
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['workflow-runs', tab, status, workflowId, page],
    queryFn: () =>
      tab === 'incidents'
        ? workflowService.incidents()
        : workflowService.listRuns({ status, workflowId, page, pageSize: PAGE_SIZE }),
    // Runs move on their own; keep the operator's view current without a manual reload.
    refetchInterval: 15_000,
  });

  if (legacyRunId) return <Navigate to={'/automation/runs/' + legacyRunId} replace />;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = (id: string) => navigate('/automation/runs/' + id);
  const viewButton = (id: string, box: string) => (
    <Button asChild variant="ghost" size="icon" className={cn(box, 'text-muted-foreground hover:text-foreground')} title="View run">
      <Link to={'/automation/runs/' + id} aria-label="View run" onClick={(e) => e.stopPropagation()}>
        <Eye className="h-4 w-4" />
      </Link>
    </Button>
  );
  const emptyText =
    tab === 'incidents' ? 'No incidents — no run has failed or been interrupted.' : 'No runs match these filters.';

  return (
    <div className="@container space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Runs &amp; Incidents</h1>
          <p className="text-sm text-muted-foreground">
            {tab === 'incidents'
              ? total + (total === 1 ? ' run needs' : ' runs need') + ' attention'
              : total + (total === 1 ? ' run' : ' runs')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'all' | 'incidents'); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All runs</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'all' ? (
          <>
            <Select value={status || ANY} onValueChange={(v) => { setStatus(v === ANY ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Status">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s || ANY} value={s || ANY}>{s ? statusLabel(s) : 'Any status'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workflowId || ANY} onValueChange={(v) => { setWorkflowId(v === ANY ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full sm:w-64" aria-label="Workflow">
                <SelectValue placeholder="Any workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any workflow</SelectItem>
                {workflows.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
      </div>

      {isError ? <p className="text-sm text-destructive">Could not load runs.</p> : null}

      {/* Phones: one card per run. */}
      <ul className="space-y-3 @3xl:hidden" aria-label="Runs">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-3 rounded-xl border bg-card p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))
        ) : items.length === 0 ? (
          <li className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</li>
        ) : (
          items.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card shadow-sm">
              <button type="button" onClick={() => open(r.id)} className="block w-full rounded-t-xl p-4 text-left transition-colors active:bg-accent/60">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-semibold leading-snug">{r.workflowName ?? r.workflowId ?? '—'}</p>
                  <StatusBadge status={r.status} />
                </div>
                <dl className="mt-3 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Trigger</dt>
                  <dd className="min-w-0 break-words">{triggerLabel(r.triggerEvent)}</dd>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd className="min-w-0 break-words">{when(r.startedAt)}</dd>
                  <dt className="text-muted-foreground">Finished</dt>
                  <dd className="min-w-0 break-words">{when(r.completedAt)}</dd>
                  {r.error ? (
                    <>
                      <dt className="text-muted-foreground">Error</dt>
                      <dd className="min-w-0 break-words text-destructive">{r.error}</dd>
                    </>
                  ) : null}
                </dl>
              </button>
              <div className="flex items-center justify-end gap-2 border-t px-2 py-1">{viewButton(r.id, 'h-10 w-10')}</div>
            </li>
          ))
        )}
      </ul>

      {/* Wider screens: the table. */}
      <div className="hidden rounded-xl border bg-card @3xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="sticky right-0 w-[88px] bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => open(r.id)}>
                  <TableCell className="font-medium">{r.workflowName ?? r.workflowId ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{triggerLabel(r.triggerEvent)}</TableCell>
                  <TableCell className="tabular-nums">{when(r.startedAt)}</TableCell>
                  <TableCell className="tabular-nums">{when(r.completedAt)}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-destructive" title={r.error ?? ''}>
                    {r.error ?? ''}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card text-right" onClick={(e) => e.stopPropagation()}>
                    {viewButton(r.id, 'h-8 w-8')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {tab === 'all' ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
            {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
          </span>
          {/* Circular page numbers — active page is a filled primary disc. */}
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageWindow(page, pages).map((p, i) =>
              p === 'ellipsis' ? (
                <span key={'e' + i} aria-hidden="true" className="grid h-9 w-9 place-items-center text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-label={'Page ' + p}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => setPage(p)}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full text-sm font-medium tabular-nums transition-colors',
                    p === page ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
