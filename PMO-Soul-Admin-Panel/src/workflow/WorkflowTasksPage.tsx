import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListChecks, Loader2, UserPlus, Hand, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RecordPickerField from './RecordPickerField';
import workflowService, { taskAdminService, type WorkflowTask } from './workflowService';

/**
 * Task console (Wave D) — every workflow task in the app, for the person who runs the process.
 *
 * "My Tasks" stays the personal inbox: it only lists what is assigned to you and is where a task
 * gets completed. This page is the other side: who is holding what, what is overdue, and the
 * three moves an operator needs when an assignee is away — hand it to someone else, take it
 * yourself, or drop it so the run can be cancelled cleanly.
 */

const STATUSES = ['', 'OPEN', 'ESCALATED', 'COMPLETED', 'CANCELLED'] as const;

const isLive = (status?: string) => status === 'OPEN' || status === 'ESCALATED';

function statusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (String(status || '').toUpperCase()) {
    case 'ESCALATED':
      return 'destructive';
    case 'OPEN':
      return 'secondary';
    case 'COMPLETED':
      return 'default';
    default:
      return 'outline';
  }
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function assigneeLabel(t: WorkflowTask): string {
  if (t.assigneeNames && t.assigneeNames.length) return t.assigneeNames.join(', ');
  if (t.assigneeUserIds && t.assigneeUserIds.length) return 'Users ' + t.assigneeUserIds.join(', ');
  return t.assigneeSpec || 'Unassigned';
}

function ReassignDialog({ task, onClose }: { task: WorkflowTask | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'task-console'],
    queryFn: async () => (await api.get('/api/rolesandpermissions', { params: { limit: 100 } })).data,
    enabled: !!task,
  });
  const roles: string[] = ((rolesData?.data ?? rolesData ?? []) as Array<{ role: string }>)
    .map((r) => r.role)
    .filter(Boolean);

  const reassign = useMutation({
    mutationFn: () =>
      taskAdminService.reassign(task!.id, userId ? { userIds: [Number(userId)] } : { role }),
    onSuccess: () => {
      toast.success('Task reassigned');
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks-admin'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not reassign this task'),
  });

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign task</DialogTitle>
          <DialogDescription>{task?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>To a person</Label>
            <RecordPickerField source="user" value={userId} onChange={(v) => { setUserId(v); if (v) setRole(''); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Or to a role</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={role}
              onChange={(e) => { setRole(e.target.value); if (e.target.value) setUserId(''); }}
            >
              <option value="">Choose a role…</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => reassign.mutate()} disabled={reassign.isPending || (!userId && !role)}>
            {reassign.isPending ? 'Reassigning…' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowTasksPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('OPEN');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [reassigning, setReassigning] = useState<WorkflowTask | null>(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.list(),
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workflow-tasks-admin', status, workflowId, assignee],
    queryFn: () => taskAdminService.list({ status, workflowId, assignee }),
    refetchInterval: 30_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workflow-tasks-admin'] });
  const fail = (fallback: string) => (err: any) => toast.error(err?.response?.data?.message ?? fallback);

  const claim = useMutation({
    mutationFn: (id: string) => taskAdminService.claim(id),
    onSuccess: () => { toast.success('Task claimed — it is now in your inbox'); refresh(); },
    onError: fail('Could not claim this task'),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => taskAdminService.cancel(id),
    onSuccess: () => { toast.success('Task cancelled'); refresh(); },
    onError: fail('Could not cancel this task'),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5" />
        <h1 className="text-xl font-semibold">All Tasks</h1>
        {items.length > 0 ? <Badge variant="secondary">{data?.total ?? items.length}</Badge> : null}
        <Button asChild variant="link" size="sm" className="ml-auto">
          <Link to="/my-tasks">Go to My Tasks</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'Any status'}</option>
          ))}
        </select>
        <select
          aria-label="Workflow"
          className="h-9 max-w-[260px] rounded-md border border-input bg-background px-2 text-sm"
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
        >
          <option value="">Any workflow</option>
          {workflows.map((w) => (
            <option key={w.id} value={String(w.id)}>{w.name}</option>
          ))}
        </select>
        <Input
          aria-label="Assignee"
          placeholder="Assignee (user id, email or role:Name)"
          className="h-9 w-64"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load tasks.</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No tasks match these filters.</CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => {
                const overdue = !!t.dueAt && isLive(t.status) && new Date(t.dueAt).getTime() < Date.now();
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.title}
                      {t.instructions ? <p className="text-xs text-muted-foreground">{t.instructions}</p> : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.workflowName ?? t.workflowId ?? '—'}
                      {t.runId ? (
                        <Link
                          to={'/automation/runs?runId=' + t.runId}
                          className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground"
                          title={'Run ' + t.runId}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">{assigneeLabel(t)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className={'text-xs' + (overdue ? ' text-destructive' : '')}>
                      {overdue ? 'Overdue — ' : ''}{when(t.dueAt)}
                    </TableCell>
                    <TableCell className="text-xs">{when(t.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {isLive(t.status) ? (
                        <>
                          <Button variant="ghost" size="sm" title="Reassign" onClick={() => setReassigning(t)}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Claim" onClick={() => claim.mutate(t.id)} disabled={claim.isPending}>
                            <Hand className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Cancel task" onClick={() => cancel.mutate(t.id)} disabled={cancel.isPending}>
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ReassignDialog task={reassigning} onClose={() => setReassigning(null)} />
    </div>
  );
}
