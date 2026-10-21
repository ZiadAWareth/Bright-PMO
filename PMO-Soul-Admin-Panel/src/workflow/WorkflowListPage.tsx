import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Power, Trash2, Loader2, Download, Upload, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import workflowService, { type Workflow } from './workflowService';
import { downloadWorkflowFile } from './workflowFile';
import ImportWorkflowDialog from './ImportWorkflowDialog';

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'INACTIVE'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'border-border bg-muted text-muted-foreground';
  return <Badge variant="outline" className={cn('text-[11px] font-semibold', cls)}>{status || 'DRAFT'}</Badge>;
}

/** Marks a workflow the platform provides to every organization. */
function PlatformBadge({ className }: { className?: string }) {
  return (
    <span
      title="Provided by the platform to every organization"
      className={cn('inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20', className)}
    >
      Platform
    </span>
  );
}

export default function WorkflowListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Workflow | null>(null);
  // A workflow the platform provides runs for this organization but belongs to the platform:
  // only the platform administrator may switch it on/off or delete it (the API refuses anyone else).
  const { user } = useAuth();
  const isPlatformAdmin = !!user?.isPlatformAdmin || user?.organizationId === 0;
  const readOnly = (wf: Workflow) => !!wf.isPlatform && !isPlatformAdmin;

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workflows'] });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? workflows.filter((w) => w.name.toLowerCase().includes(q)) : workflows;
  }, [workflows, search]);

  const handleToggle = async (wf: Workflow) => {
    try {
      if (wf.status === 'ACTIVE') {
        await workflowService.deactivate(wf.id);
        toast.success('"' + wf.name + '" deactivated');
      } else {
        await workflowService.activate(wf.id);
        toast.success('"' + wf.name + '" activated');
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  // Export reads the saved workflow (the list holds only a summary) and saves it as a file.
  const [importOpen, setImportOpen] = useState(false);
  const handleExport = async (wf: Workflow) => {
    try {
      const full = await workflowService.getOne(wf.id);
      downloadWorkflowFile({
        name: full.name,
        description: full.description,
        entityName: full.entityName || '',
        definition: full.definition || { nodes: [], edges: [] },
      } as any);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await workflowService.remove(toDelete.id);
      toast.success('"' + toDelete.name + '" deleted');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="@container space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} title="Import a workflow file">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button onClick={() => navigate('/automation/workflows/new')}>
            <Plus className="h-4 w-4" /> Add<span className="hidden sm:inline"> Workflow</span>
          </Button>
        </div>
      </div>
      <ImportWorkflowDialog open={importOpen} onOpenChange={setImportOpen} />

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows…"
          className="pl-9"
        />
      </div>

      {/* Phones: one card per workflow; the table from md up. */}
      <ul className="space-y-3 @2xl:hidden" aria-label="Workflows">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="space-y-3 rounded-xl border bg-card p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </li>
          ))
        ) : rows.length === 0 ? (
          <li className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No workflows found.</li>
        ) : (
          rows.map((wf) => (
            <li key={wf.id} className="rounded-xl border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/automation/workflows/' + wf.id)}
                className="block w-full rounded-t-xl p-4 text-left transition-colors active:bg-accent/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-semibold leading-snug">
                    {wf.name}
                    {wf.isPlatform ? <PlatformBadge className="ml-2 align-middle" /> : null}
                  </p>
                  <StatusBadge status={wf.status} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {(wf.entityName || 'No entity') + ' · v' + (wf.version ?? 1) + (wf.updatedAt ? ' · ' + new Date(wf.updatedAt).toLocaleDateString() : '')}
                </p>
              </button>
              <div className="border-t px-2 py-1">
                <div className="flex items-center justify-end gap-0.5">
                  {readOnly(wf) ? null : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-10 w-10 text-muted-foreground hover:text-foreground', wf.status === 'ACTIVE' && 'text-emerald-600 dark:text-emerald-400')}
                      title={wf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      aria-label={wf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggle(wf)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    title="Export as a file"
                    aria-label="Export"
                    onClick={() => handleExport(wf)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    title="Version history"
                    aria-label="Version history"
                    onClick={() => navigate('/automation/workflows/' + wf.id + '?history=1')}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => navigate('/automation/workflows/' + wf.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {readOnly(wf) ? null : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => setToDelete(wf)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden rounded-xl border bg-card @2xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[176px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No workflows found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((wf) => (
                <TableRow
                  key={wf.id}
                  className="cursor-pointer"
                  onClick={() => navigate('/automation/workflows/' + wf.id)}
                >
                  <TableCell className="font-medium">
                    {wf.name}
                    {wf.isPlatform ? <PlatformBadge className="ml-2" /> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{wf.entityName || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={wf.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate('/automation/workflows/' + wf.id + '?history=1')}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Version history"
                      aria-label={'Version history of ' + wf.name + ', currently version ' + (wf.version ?? 1)}
                    >
                      v{wf.version ?? 1} <History className="h-3 w-3" aria-hidden />
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {wf.updatedAt ? new Date(wf.updatedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Export as a file"
                        aria-label="Export"
                        onClick={() => handleExport(wf)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => navigate('/automation/workflows/' + wf.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {readOnly(wf) ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-8 w-8 text-muted-foreground hover:text-foreground',
                            wf.status === 'ACTIVE' && 'text-emerald-600 dark:text-emerald-400'
                          )}
                          title={wf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          aria-label={wf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggle(wf)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                      {readOnly(wf) ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                          aria-label="Delete"
                          onClick={() => setToDelete(wf)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete "{toDelete?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
