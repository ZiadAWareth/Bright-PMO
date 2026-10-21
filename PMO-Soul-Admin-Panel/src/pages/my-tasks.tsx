import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/** One field the workflow author asked the assignee to fill in. */
interface TaskField {
  key: string;
  label?: string;
}

/** Mirrors the WorkflowTask model. */
interface WorkflowTask {
  id: string;
  title: string;
  instructions?: string | null;
  form?: TaskField[] | null;
  dueAt?: string | null;
  status: string;
  createdAt: string;
}

function dueLabel(dueAt?: string | null): { text: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const overdue = due.getTime() < Date.now();
  return { text: (overdue ? 'Overdue — due ' : 'Due ') + due.toLocaleString(), overdue };
}

function TaskForm({ task, onDone }: { task: WorkflowTask; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/workflow-tasks/${task.id}/complete`, { formData: values })).data,
    onSuccess: () => {
      toast.success('Task completed');
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      onDone();
    },
    onError: (err: any) => {
      // The server refuses on a double submit and on a workflow that changed underneath. Both
      // messages are written to be read by the assignee, so show them rather than a generic one.
      toast.error(err?.response?.data?.message ?? 'Could not complete this task');
    },
  });

  const fields = Array.isArray(task.form) ? task.form : [];

  return (
    <div className="space-y-4 border-t pt-4">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to fill in — completing this task just lets the workflow continue.
        </p>
      ) : (
        fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`${task.id}-${field.key}`}>{field.label ?? field.key}</Label>
            <Input
              id={`${task.id}-${field.key}`}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))
      )}
      <div className="flex gap-2">
        <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {submit.isPending ? 'Submitting…' : 'Complete task'}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={submit.isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function MyTasks() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<WorkflowTask[]>({
    queryKey: ['workflow-tasks'],
    queryFn: async () => (await api.get('/api/workflow-tasks')).data,
    // A task can arrive at any moment from a workflow nobody in this tab triggered.
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="p-6 text-sm text-destructive">Could not load your tasks.</p>;
  }

  const tasks = data ?? [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        <h1 className="text-xl font-semibold">My Tasks</h1>
        {tasks.length > 0 && <Badge variant="secondary">{tasks.length}</Badge>}
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No tasks are waiting for you.
          </CardContent>
        </Card>
      ) : (
        tasks.map((task) => {
          const due = dueLabel(task.dueAt);
          return (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  {due && (
                    <Badge variant={due.overdue ? 'destructive' : 'secondary'} className="shrink-0">
                      <Clock className="mr-1 h-3 w-3" />
                      {due.text}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.instructions && (
                  <p className="text-sm text-muted-foreground">{task.instructions}</p>
                )}
                {openId === task.id ? (
                  <TaskForm task={task} onDone={() => setOpenId(null)} />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setOpenId(task.id)}>
                    Open
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
