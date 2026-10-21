import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Eye, History, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import workflowService, { type WorkflowDefinition, type WorkflowVersion } from './workflowService';

/**
 * Version history, docked beside the canvas in the workflow editor.
 *
 * Every save that changes the steps is a version. Picking one shows it on the canvas, read-only;
 * restoring it (from the banner over the canvas) saves its steps as a NEW version, so nothing is
 * ever lost and a restore can itself be undone.
 */
export default function WorkflowVersionHistory({
  workflowId,
  currentVersion,
  previewingId,
  onPreview,
  onExitPreview,
  onClose,
}: {
  workflowId: string;
  currentVersion?: number | null;
  previewingId?: string | null;
  onPreview: (v: WorkflowVersion) => void;
  onExitPreview: () => void;
  onClose: () => void;
}) {
  const { data: versions = [], isLoading, isError } = useQuery({
    queryKey: ['workflow-versions', workflowId, currentVersion],
    queryFn: () => workflowService.versions(workflowId),
    enabled: !!workflowId,
  });

  return (
    <aside
      aria-label="Version history"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Version history</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close version history"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="border-b px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Each save that changes the steps is kept. Pick one to view it; restoring saves it as a new version.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading versions…
          </div>
        ) : isError ? (
          <p className="px-2 py-6 text-sm text-destructive">Could not load the version history.</p>
        ) : versions.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">No saved versions yet. Save the workflow to start its history.</p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => {
              const isCurrent = currentVersion != null && v.version === currentVersion;
              const isPreviewing = previewingId === v.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => (isCurrent ? onExitPreview() : onPreview(v))}
                    aria-current={isPreviewing || (isCurrent && !previewingId) ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isPreviewing
                        ? 'border-primary/50 bg-primary/5'
                        : isCurrent && !previewingId
                          ? 'border-border bg-muted/50'
                          : 'border-transparent hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-7 min-w-[2.25rem] place-items-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
                        isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                      )}
                    >
                      v{v.version}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {isCurrent ? 'Current version' : 'Version ' + v.version}
                        {isPreviewing ? (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
                            <Eye className="h-3 w-3" aria-hidden /> Viewing
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground" title={v.createdAt ? new Date(v.createdAt).toLocaleString() : undefined}>
                        {v.createdAt ? formatDistanceToNow(new Date(v.createdAt), { addSuffix: true }) : '—'}
                        {v.createdBy ? ' · ' + v.createdBy : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** "2 steps added, 1 removed, 3 changed" — how a version differs from the steps now on the canvas. */
export function describeDifference(from: WorkflowDefinition | null | undefined, to: WorkflowDefinition | null | undefined): string {
  const a = new Map((from?.nodes ?? []).map((n) => [n.id, n]));
  const b = new Map((to?.nodes ?? []).map((n) => [n.id, n]));
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const [id, n] of b) {
    const old = a.get(id);
    if (!old) added += 1;
    else if (old.type !== n.type || (old.label ?? '') !== (n.label ?? '') || JSON.stringify(old.config ?? {}) !== JSON.stringify(n.config ?? {})) changed += 1;
  }
  for (const id of a.keys()) if (!b.has(id)) removed += 1;
  const edgeKey = (d?: WorkflowDefinition | null) => (d?.edges ?? []).map((e) => e.from + '>' + e.to + ':' + (e.condition ?? '')).sort().join('|');
  const rewired = edgeKey(from) !== edgeKey(to);
  const parts = [
    added ? added + ' step' + (added === 1 ? '' : 's') + ' added' : '',
    removed ? removed + ' removed' : '',
    changed ? changed + ' changed' : '',
  ].filter(Boolean);
  if (!parts.length) return rewired ? 'Same steps, connected differently' : 'Same as now';
  return parts.join(', ') + (rewired ? '; connections differ' : '');
}
