import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useFeature } from '@/lib/features';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The list shape from GET /api/agent/agents — every field except `instructions`. */
interface AgentRow {
  id: string;
  name: string;
  role: string | null;
  allowedEntities: string[];
  allowedTools: string[];
  webSearch: boolean;
  modelOverride: string | null;
  maxIterations: number | null;
  outputSchema: Record<string, unknown> | null;
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] }; status?: number } })
    .response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/** "1 tool", "2 tools". Small, but "1 tools" on a permissions list reads as a broken page. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/*
 * An empty list means the agent may read NOTHING — `withinCeiling` returns false for every name
 * when the ceiling is `[]`, and only `null` means unrestricted. Said that way, never "no limit".
 */
const ToolsBadge = ({ a }: { a: AgentRow }) => (
  <Badge variant={a.allowedTools.length ? 'secondary' : 'outline'}>
    {a.allowedTools.length ? plural(a.allowedTools.length, 'tool') : 'No tools — cannot read'}
  </Badge>
);
const TablesBadge = ({ a }: { a: AgentRow }) => (
  <Badge variant="outline">
    {a.allowedEntities.length ? plural(a.allowedEntities.length, 'table') : 'No tables — cannot read'}
  </Badge>
);
const OutputBadge = ({ a }: { a: AgentRow }) =>
  a.outputSchema ? <Badge variant="secondary">Typed output</Badge> : <Badge variant="outline">Prose only</Badge>;

/**
 * The Agents list — laid out like every other list in the app: a header, a search, the table (its
 * headers shown even before the first agent exists), and cards on a narrow screen. An agent is
 * created and edited on its own page (agent-editor.tsx), not in a dialog over this one.
 */
export default function AgentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Reading the list is open to anyone signed in — a workflow designer has to see what agents
  // exist to pick one. Creating, editing and deleting need the role's "AI provider & agents"
  // switch, the same check the backend makes. Offering a button that always 403s is worse than
  // not offering it.
  const canManage = useFeature('aiSettings');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AgentRow | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agent', 'agents'],
    queryFn: async () => (await api.get('/api/agent/agents')).data as AgentRow[],
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/agent/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'agents'] });
      toast.success('Agent deleted.');
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const all = agents ?? [];
  const q = search.trim().toLowerCase();
  const rows = q ? all.filter((a) => (a.name + ' ' + (a.role ?? '')).toLowerCase().includes(q)) : all;
  const emptyText = all.length
    ? 'No agents match your search.'
    : canManage
      ? 'No agents yet. Create one, then pick it from an AI Agent step on a workflow.'
      : 'No agents yet. An administrator can add one.';
  const open = (a: AgentRow) => (canManage ? navigate(`/agent/agents/${a.id}/edit`) : undefined);

  const rowActions = (a: AgentRow, size: 'sm' | 'touch') => {
    if (!canManage) return null;
    const box = size === 'touch' ? 'h-10 w-10' : 'h-8 w-8';
    return (
      <div className="flex items-center justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(box, 'text-muted-foreground hover:text-foreground')}
          title="Edit"
          aria-label={`Edit ${a.name}`}
          onClick={() => navigate(`/agent/agents/${a.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(box, 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}
          title="Delete"
          aria-label={`Delete ${a.name}`}
          onClick={() => setConfirmDelete(a)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    // @container: cards or table is decided by the width THIS list has, as on every list screen.
    <div className="@container space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : plural(all.length, 'agent')} · Each one is a job description; pick it
            in a workflow's <strong className="font-medium text-foreground">AI Agent</strong> step.
            {canManage ? null : ' Only an administrator can add or change one.'}
          </p>
        </div>
        {canManage ? (
          <Button className="shrink-0" onClick={() => navigate('/agent/agents/new')}>
            <Plus className="h-4 w-4" /> New<span className="hidden sm:inline"> agent</span>
          </Button>
        ) : null}
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents…" className="pl-9" aria-label="Search agents" />
      </div>

      {/* Phones: one card per agent. */}
      <ul className="space-y-3 @3xl:hidden" aria-label="Agents">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="space-y-3 rounded-xl border bg-card p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </li>
          ))
        ) : rows.length === 0 ? (
          <li className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</li>
        ) : (
          rows.map((a) => (
            <li key={a.id} className="rounded-xl border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => open(a)}
                className="block w-full rounded-t-xl p-4 text-left transition-colors active:bg-accent/60"
              >
                <p className="break-words font-semibold leading-snug">{a.name}</p>
                <p className="mt-0.5 break-words text-sm text-muted-foreground">{a.role || 'No role described.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ToolsBadge a={a} />
                  <TablesBadge a={a} />
                  <OutputBadge a={a} />
                </div>
              </button>
              {canManage ? <div className="flex justify-end border-t px-2 py-1">{rowActions(a, 'touch')}</div> : null}
            </li>
          ))
        )}
      </ul>

      {/* A list at least 48rem wide: the table — its headers there even before the first agent. */}
      <div className="hidden rounded-xl border bg-card @3xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>May do</TableHead>
              <TableHead>May read</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead>Model</TableHead>
              {canManage ? <TableHead className="sticky right-0 w-[96px] bg-card text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canManage ? 6 : 5 }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.id} className={canManage ? 'cursor-pointer' : undefined} onClick={() => open(a)}>
                  <TableCell className="max-w-[22rem]">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.role || 'No role described.'}</p>
                  </TableCell>
                  <TableCell>
                    <ToolsBadge a={a} />
                    {a.webSearch ? <Badge variant="outline" className="ml-1.5">Web</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <TablesBadge a={a} />
                  </TableCell>
                  <TableCell>
                    <OutputBadge a={a} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.modelOverride || "App's model"}</TableCell>
                  {canManage ? (
                    <TableCell className="sticky right-0 bg-card" onClick={(e) => e.stopPropagation()}>
                      {rowActions(a, 'sm')}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {confirmDelete ? (
        <Dialog open onOpenChange={(o) => (o ? null : setConfirmDelete(null))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {confirmDelete.name}?</DialogTitle>
              <DialogDescription>
                Any workflow step still pointing at this agent will fail when it next runs. Its past
                runs are kept — they are the audit trail and the token bill.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => remove.mutate(confirmDelete.id)} disabled={remove.isPending}>
                {remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
