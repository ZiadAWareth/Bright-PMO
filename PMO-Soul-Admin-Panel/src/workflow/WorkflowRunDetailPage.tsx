import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDashed,
  Clock,
  Copy,
  ExternalLink,
  History,
  Loader2,
  MinusCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import workflowService, { formatUsage, type RunUsage, type WorkflowRun, type WorkflowRunStep } from './workflowService';
import { useWorkflowCatalog } from './useWorkflowCatalog';
import { PulseIcon } from './CustomNodes';
import { StatusBadge, statusLabel } from './WorkflowRunsPage';

/**
 * One run, on its own page (it used to be a modal over the run list).
 *
 * Read top to bottom the way an operator investigates: what ran and how it ended (header and facts),
 * what went wrong (the error, with a jump to the step that failed), what started it (the record), and
 * then every step in order — each opens to show exactly what it received, what it produced, and its
 * error. The failed (or waiting) step opens by itself.
 */

const isWaiting = (s?: string) => s === 'PAUSED' || s === 'WAITING';
const canCancel = (s?: string) => s === 'RUNNING' || isWaiting(s);
const canRetry = (s?: string) => s === 'FAILED' || s === 'CANCELLED';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const ms = (n?: number | null) => (typeof n === 'number' ? (n >= 1000 ? (n / 1000).toFixed(1) + ' s' : n + ' ms') : '—');

function duration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—';
  return ms(new Date(end).getTime() - new Date(start).getTime());
}

/** What started a run, in words. */
function triggerLabel(event?: string): string {
  switch (event) {
    case 'onCreate':
      return 'Record created';
    case 'onUpdate':
      return 'Record updated';
    case 'onDelete':
      return 'Record deleted';
    case 'manual':
    case 'manualStart':
      return 'Started by hand';
    case 'webhook':
      return 'Webhook';
    case 'schedule':
    case 'scheduled':
      return 'Schedule';
    case 'taskCompleted':
      return 'Task completed';
    default:
      return event || '—';
  }
}

/** Per-status look of a step on the timeline: rail dot, icon, and the colour that carries it. */
function stepLook(status?: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return { Icon: Check, dot: 'bg-primary text-primary-foreground', label: 'Completed' };
  if (s === 'FAILED') return { Icon: XCircle, dot: 'bg-destructive text-destructive-foreground', label: 'Failed' };
  if (s === 'SKIPPED') return { Icon: MinusCircle, dot: 'bg-muted text-muted-foreground', label: 'Skipped' };
  if (s === 'WAITING' || s === 'PAUSED') return { Icon: Clock, dot: 'bg-amber-500 text-white', label: 'Waiting' };
  if (s === 'RUNNING') return { Icon: Loader2, dot: 'bg-primary/80 text-primary-foreground', label: 'Running' };
  return { Icon: CircleDashed, dot: 'bg-muted text-muted-foreground', label: 'Pending' };
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what + ' copied');
  } catch {
    toast.error('Could not copy — select the text instead');
  }
}

/** A JSON block with a copy button. Empty values say so instead of showing "{}". */
function DataBlock({ title, value, tone }: { title: string; value: unknown; tone?: 'error' }) {
  const empty =
    value === undefined ||
    value === null ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);
  const text = empty ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {!empty ? (
          <button
            type="button"
            onClick={() => copy(text, title)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={'Copy ' + title.toLowerCase()}
          >
            <Copy className="h-3 w-3" aria-hidden /> Copy
          </button>
        ) : null}
      </div>
      {empty ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">Nothing</p>
      ) : (
        <pre
          className={cn(
            'max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border px-3 py-2 font-mono text-xs leading-relaxed',
            tone === 'error' ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'bg-muted/40 text-foreground',
          )}
        >
          {text}
        </pre>
      )}
    </div>
  );
}

function StepRow({
  step,
  index,
  isLast,
  label,
  pulseLabel,
  pulseIcon,
  open,
  onToggle,
  innerRef,
}: {
  step: WorkflowRunStep;
  index: number;
  isLast: boolean;
  label: string;
  pulseLabel?: string;
  pulseIcon?: string;
  open: boolean;
  onToggle: () => void;
  innerRef?: (el: HTMLLIElement | null) => void;
}) {
  const look = stepLook(step.status);
  const type = step.nodeType ?? (step as any).pulseType ?? step.nodeKind;
  const panelId = 'step-panel-' + (step.id ?? index);
  return (
    <li ref={innerRef} className="relative flex gap-3 pb-4 last:pb-0">
      {/* Rail: the run's path, step to step */}
      {!isLast ? <span className="absolute left-[13px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden /> : null}
      <span className={cn('relative z-10 mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', look.dot)} aria-hidden>
        <look.Icon className={cn('h-3.5 w-3.5', step.status === 'RUNNING' && 'animate-spin')} />
      </span>

      <div className={cn('min-w-0 flex-1 rounded-lg border bg-card', step.status === 'FAILED' && 'border-destructive/40')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border bg-background">
            <PulseIcon type={type} icon={pulseIcon} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              <span className="mr-1.5 tabular-nums text-muted-foreground">{index + 1}.</span>
              {label}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{pulseLabel ?? type}</span>
          </span>
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* On a phone the rail dot carries the status; the badge would crush the step's name. */}
            <span className="hidden sm:inline-flex">
              <StatusBadge status={step.status} label={look.label} />
            </span>
            <span className="sr-only sm:hidden">{look.label}</span>
            <span className="w-14 text-right tabular-nums">{ms(step.durationMs)}</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </span>
        </button>

        {open ? (
          <div id={panelId} className="space-y-3 border-t px-3 py-3">
            {step.error ? <DataBlock title="Error" value={step.error} tone="error" /> : null}
            <div className="grid gap-3 lg:grid-cols-2">
              <DataBlock title="Input" value={step.input} />
              <DataBlock title="Output" value={step.output} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ran {when(step.executedAt)} · step id <span className="font-mono">{step.nodeId}</span>
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function WorkflowRunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: catalog } = useWorkflowCatalog();

  const { data: run, isLoading, isError } = useQuery<WorkflowRun>({
    queryKey: ['workflow-run', runId],
    queryFn: () => workflowService.run(runId as string),
    enabled: !!runId,
    // A run still moving keeps this page current; a finished one stops polling.
    refetchInterval: (q) => {
      const s = (q.state.data as WorkflowRun | undefined)?.status;
      return s === 'RUNNING' || isWaiting(s) ? 5_000 : false;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] });
  };
  const cancel = useMutation({
    mutationFn: () => workflowService.cancelRun(runId as string),
    onSuccess: () => {
      toast.success('Run cancelled');
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not cancel this run'),
  });
  const retry = useMutation({
    mutationFn: () => workflowService.retryRun(runId as string),
    onSuccess: (res) => {
      toast.success('Retry started');
      refresh();
      if (res?.id) navigate('/automation/runs/' + res.id);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not retry this run'),
  });

  const steps: WorkflowRunStep[] = Array.isArray(run?.steps) ? (run!.steps as WorkflowRunStep[]) : [];
  const nodesById = useMemo(() => new Map((run?.definition?.nodes ?? []).map((n) => [n.id, n])), [run?.definition]);
  const pulseByType = useMemo(() => new Map((catalog?.pulses ?? []).map((p) => [p.type, p])), [catalog]);

  // The step to look at first: the failed one, else the one the run is waiting on, else (a run that
  // ended with an error on purpose, through End (Error)) the last one.
  const failedStepIndex = steps.findIndex((s) => s.status === 'FAILED');
  const focusIndex = useMemo(() => {
    if (failedStepIndex >= 0) return failedStepIndex;
    const waiting = steps.findIndex((s) => s.status === 'WAITING' || (run?.pausedAtNodeId && s.nodeId === run.pausedAtNodeId));
    if (waiting >= 0) return waiting;
    return run?.status === 'FAILED' && steps.length ? steps.length - 1 : -1;
  }, [steps, failedStepIndex, run?.pausedAtNodeId, run?.status]);

  const [open, setOpen] = useState<Set<number>>(new Set());
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !run) return;
    seeded.current = true;
    if (focusIndex >= 0) setOpen(new Set([focusIndex]));
  }, [run, focusIndex]);
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const goToStep = (i: number) => {
    setOpen((prev) => new Set(prev).add(i));
    requestAnimationFrame(() => rowRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  // AI steps report token usage on their output; the run total is the sum.
  const usage = steps.reduce<RunUsage | null>((acc, s) => {
    const u = (s.output as { usage?: RunUsage } | undefined)?.usage;
    if (!u || !u.calls) return acc;
    const base = acc ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    return {
      calls: base.calls + u.calls,
      inputTokens: base.inputTokens + (u.inputTokens || 0),
      outputTokens: base.outputTokens + (u.outputTokens || 0),
      ...(typeof u.costUsd === 'number' || typeof base.costUsd === 'number' ? { costUsd: (base.costUsd ?? 0) + (u.costUsd ?? 0) } : {}),
    };
  }, null);
  const usageLine = formatUsage(usage);

  const parked = run?.pausedAtNodeId ? steps.find((s) => s.nodeId === run.pausedAtNodeId) : undefined;
  const parkedType = parked ? (parked as any).pulseType ?? parked.nodeType ?? null : null;
  const [triggerOpen, setTriggerOpen] = useState(false);

  const back = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
        <Link to="/automation/runs" aria-label="Back to Runs & Incidents">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <Link to="/automation/runs" className="hover:text-foreground hover:underline">
        Runs &amp; Incidents
      </Link>
      <span aria-hidden>/</span>
      <span className="font-mono text-foreground" aria-current="page">
        {runId ? runId.slice(0, 8) : ''}
      </span>
    </nav>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        {back}
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading run…
        </div>
      </div>
    );
  }
  if (isError || !run) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        {back}
        <p className="text-sm text-destructive">This run could not be found. It may belong to another organization or have been removed.</p>
      </div>
    );
  }

  const ranOn = run.definitionVersion;
  const behind = ranOn != null && run.currentVersion != null && ranOn !== run.currentVersion;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      {back}

      {/* Header: what ran, how it ended, and what can be done about it */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">{run.workflowName ?? 'Workflow run'}</h1>
            <StatusBadge status={run.status} label={statusLabel(run.status, parkedType)} />
          </div>
          <button
            type="button"
            onClick={() => copy(run.id, 'Run id')}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            title="Copy the run id"
          >
            {run.id} <Copy className="h-3 w-3" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {run.workflowId ? (
            <Button asChild variant="outline" size="sm">
              <Link to={'/automation/workflows/' + run.workflowId + '?runId=' + run.id}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in modeler
              </Link>
            </Button>
          ) : null}
          {canCancel(run.status) ? (
            <Button variant="outline" size="sm" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> {cancel.isPending ? 'Cancelling…' : 'Cancel run'}
            </Button>
          ) : null}
          {canRetry(run.status) ? (
            <Button size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {retry.isPending ? 'Retrying…' : 'Retry'}
            </Button>
          ) : null}
        </div>
      </header>

      {/* Facts */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Trigger</dt>
          <dd className="truncate font-medium">{triggerLabel(run.triggerEvent)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Version</dt>
          <dd className="font-medium">
            {ranOn != null ? (
              run.workflowId ? (
                <Link
                  to={'/automation/workflows/' + run.workflowId + '?version=' + ranOn}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  title="See this version of the workflow"
                >
                  v{ranOn} <History className="h-3 w-3" aria-hidden />
                </Link>
              ) : (
                'v' + ranOn
              )
            ) : (
              '—'
            )}
            {behind ? <span className="block text-xs font-normal text-muted-foreground">now v{run.currentVersion}</span> : null}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Started</dt>
          <dd className="font-medium tabular-nums">{when(run.startedAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Finished</dt>
          <dd className="font-medium tabular-nums">{when(run.completedAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="font-medium tabular-nums">{duration(run.startedAt, run.completedAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Steps</dt>
          <dd className="font-medium tabular-nums">{steps.length}</dd>
        </div>
      </dl>

      {run.error ? (
        <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">
              {failedStepIndex >= 0 ? 'This run failed' : 'This run ended with an error'}
            </p>
            <p className="mt-0.5 break-words text-sm text-foreground">{run.error}</p>
          </div>
          {failedStepIndex >= 0 ? (
            <Button variant="outline" size="sm" onClick={() => goToStep(failedStepIndex)}>
              Go to the failed step
            </Button>
          ) : steps.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => goToStep(steps.length - 1)}>
              Go to the last step
            </Button>
          ) : null}
        </div>
      ) : isWaiting(run.status) ? (
        <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            {statusLabel(run.status, parkedType)}. The run continues once that step is settled.
          </p>
          {focusIndex >= 0 ? (
            <Button variant="outline" size="sm" onClick={() => goToStep(focusIndex)}>
              Go to that step
            </Button>
          ) : null}
        </div>
      ) : null}

      {usageLine ? <p className="text-xs text-muted-foreground">{usageLine}</p> : null}

      {/* What started it */}
      <section className="rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => setTriggerOpen((o) => !o)}
          aria-expanded={triggerOpen}
          aria-controls="run-trigger-data"
          className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            <span className="block text-sm font-semibold text-foreground">What started this run</span>
            <span className="block text-xs text-muted-foreground">The record or data the trigger received</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', triggerOpen && 'rotate-180')} aria-hidden />
        </button>
        {triggerOpen ? (
          <div id="run-trigger-data" className="border-t px-4 py-3">
            <DataBlock title="Trigger data" value={run.triggerData} />
          </div>
        ) : null}
      </section>

      {/* Every step, in the order it ran */}
      <section aria-labelledby="run-steps-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="run-steps-title" className="text-sm font-semibold text-foreground">
            Steps
          </h2>
          {steps.length > 0 ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(new Set(steps.map((_, i) => i)))}>
                Expand all
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(new Set())}>
                Collapse all
              </Button>
            </div>
          ) : null}
        </div>
        {steps.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No steps were recorded for this run.</p>
        ) : (
          <ol className="pl-0.5">
            {steps.map((s, i) => {
              const node = nodesById.get(s.nodeId);
              const type = s.nodeType ?? (s as any).pulseType;
              const pulse = type ? pulseByType.get(type) : undefined;
              return (
                <StepRow
                  key={s.id ?? s.nodeId + '-' + i}
                  step={s}
                  index={i}
                  isLast={i === steps.length - 1}
                  label={node?.label || pulse?.label || s.nodeId}
                  pulseLabel={pulse?.label}
                  pulseIcon={pulse?.icon}
                  open={open.has(i)}
                  onToggle={() => toggle(i)}
                  innerRef={(el) => {
                    rowRefs.current[i] = el;
                  }}
                />
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
