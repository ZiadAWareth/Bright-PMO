import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/**
 * "Run workflow" on a record's page: the active Manual Start workflows for this table that the
 * person may start (GET /api/workflow-start, which checks READ on the table), run on THIS record.
 *
 * The server loads the record itself and enforces the trigger's "Allowed when" conditions, so a
 * refused start comes back with the app's own reason. Hidden entirely when nothing can be started.
 */

interface Startable {
  id: string;
  name: string;
  description?: string | null;
}

export default function RunWorkflowButton({ entity, recordId }: { entity: string; recordId: string | number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Startable | null>(null);

  const { data: workflows = [] } = useQuery<Startable[]>({
    queryKey: ['workflow-start', entity],
    queryFn: async () => {
      const res = await api.get('/api/workflow-start', { params: { entity, source: 'record' } });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60_000,
    retry: false,
  });

  const start = useMutation({
    mutationFn: async (wf: Startable) =>
      (await api.post('/api/workflow-start/' + wf.id, { recordId })).data as { runId?: string; status?: string },
    onSuccess: (res, wf) => {
      setChosen(null);
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
      const status = String(res?.status || '').toUpperCase();
      const words =
        status === 'COMPLETED' ? 'finished' : status === 'FAILED' ? 'failed' : status === 'PAUSED' || status === 'WAITING' ? 'is waiting for someone' : 'started';
      const show = res?.runId ? { label: 'View run', onClick: () => navigate('/automation/runs/' + res.runId) } : undefined;
      if (status === 'FAILED') toast.error('"' + wf.name + '" ' + words, { action: show });
      else toast.success('"' + wf.name + '" ' + words, { action: show });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not start this workflow'),
  });

  if (!workflows.length) return null;

  return (
    <>
      {workflows.length === 1 ? (
        <Button variant="outline" onClick={() => setChosen(workflows[0])} title={'Run "' + workflows[0].name + '" on this record'}>
          <Play className="h-4 w-4" /> Run workflow
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Play className="h-4 w-4" /> Run workflow <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {workflows.map((wf) => (
              <DropdownMenuItem key={wf.id} onSelect={() => setChosen(wf)} className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{wf.name}</span>
                {wf.description ? <span className="line-clamp-2 text-xs text-muted-foreground">{wf.description}</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* A workflow can send email or change records: ask once, name what will run. */}
      <Dialog open={!!chosen} onOpenChange={(o) => !o && !start.isPending && setChosen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Run "{chosen?.name}"?</DialogTitle>
            <DialogDescription>
              {chosen?.description ? chosen.description + ' ' : ''}It runs on this record now, for real: anything it sends or
              changes happens straight away.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChosen(null)} disabled={start.isPending}>
              Cancel
            </Button>
            <Button onClick={() => chosen && start.mutate(chosen)} disabled={start.isPending}>
              {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
