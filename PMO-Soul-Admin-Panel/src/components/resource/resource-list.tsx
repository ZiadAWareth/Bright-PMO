import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader2,
  MailPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ColumnConfig, ResourceConfig } from '@/lib/field-types';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RelationValue } from './relation-value';
import { ColorViewer } from '@/components/fields/color-field';
import { AttachmentViewer } from '@/components/fields/attachment-field';
import { cn } from '@/lib/utils';

// Build a compact, windowed page list (1-based) with ellipses: always the first
// and last page, plus the current page and its immediate neighbours.
function pageWindow(current: number, count: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= count; p++) {
    if (p === 1 || p === count || (p >= current - 1 && p <= current + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }
  return pages;
}

function renderCell(col: ColumnConfig, value: unknown) {
  if (col.kind === 'relation' && col.relation)
    return <RelationValue relation={col.relation} value={value} />;
  if (value === null || value === undefined || value === '')
    return <span className="text-muted-foreground">—</span>;
  if (col.list && Array.isArray(value))
    return <span className="break-words">{value.map((x) => (x != null && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')}</span>;
  if (col.kind === 'bytes')
    return <span className="text-muted-foreground">{(Math.floor((String(value).length * 3) / 4) - (String(value).match(/=+$/)?.[0].length ?? 0))} bytes</span>;
  if (col.kind === 'date') {
    try { return format(new Date(value as string), 'PP'); } catch { return String(value); }
  }
  if (col.kind === 'time') {
    try { return new Date(value as string).toISOString().slice(11, 16); } catch { return String(value); }
  }
  if (col.kind === 'autonumber')
    return <span className="font-mono font-medium tabular-nums">{String(value)}</span>;
  if (col.kind === 'color')
    return <ColorViewer value={value} />;
  if (col.kind === 'file')
    return <AttachmentViewer value={value} />;
  if (col.kind === 'boolean')
    return <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
  if (col.kind === 'datetime') {
    try {
      return format(new Date(value as string), 'PP');
    } catch {
      return String(value);
    }
  }
  const s = String(value);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

const PAGE_SIZE = 10;

export function ResourceList({ config }: { config: ResourceConfig }) {
  const navigate = useNavigate();
  // Frontend route base (nested under a module when configured); API path is unaffected.
  const base = config.routeBase ?? `/${config.resource}`;
  // Records of the customer's own tables belong to organizations: the platform administrator
  // browses them but adds none (the API refuses it as well).
  const { user } = useAuth();
  const canAdd = !(config.organizationOwned && (!!user?.isPlatformAdmin || user?.organizationId === 0));
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' } | null>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<{ id: string | number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = config.hooks.useList({
    page,
    limit: PAGE_SIZE,
    sortBy: sort?.field,
    sortOrder: sort?.order,
    ...(q ? { q } : {}),
  });
  const del = config.hooks.useDelete();

  // ── Invitations (the login model only) ────────────────────────────────────────────────────────
  //
  // Asked of the SERVER rather than read off the row: the user list must not carry a password column,
  // not even a null one, so "can this person sign in yet" is a question only the backend can answer.
  // It answers from the credential itself (password IS NULL), never from a flag beside it.
  const queryClient = useQueryClient();
  const pending = useQuery<{ pending: Array<{ id: number; email: string; invite: string; expiresAt: string | null }> }>({
    queryKey: ['auth', 'invites', 'pending'],
    queryFn: async () => (await api.get('/api/auth/invites/pending')).data,
    // Only on the model that holds logins, and failures are not retried: an administrator-only route
    // answers 403 to everybody else, and the list itself must still render for them.
    enabled: Boolean(config.invites),
    retry: false,
  });
  const inviteState = new Map((pending.data?.pending ?? []).map((p) => [Number(p.id), p]));
  const invite = useMutation({
    mutationFn: async (userId: number) => (await api.post('/api/auth/invite', { userId })).data,
    onSuccess: (data: { email?: string }) => {
      toast.success('Invitation sent to ' + (data?.email ?? 'them') + '. Any earlier link no longer works.');
      queryClient.invalidateQueries({ queryKey: ['auth', 'invites', 'pending'] });
    },
    onError: (err: unknown) => {
      const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
      const message = res?.data?.message;
      toast.error(
        (Array.isArray(message) ? message.join(', ') : message) || (err as Error).message || 'The invitation could not be sent.',
      );
    },
  });

  const rows: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleSort = (field: string) =>
    setSort((s) =>
      s?.field === field
        ? s.order === 'asc'
          ? { field, order: 'desc' }
          : null
        : { field, order: 'asc' }
    );

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
  };

  // Shared by the table (md and up) and the phone cards, so the two can never offer different things.
  const inviteBadge = (row: any) => {
    const state = inviteState.get(Number(row.id));
    // Absent from the pending list = this person HAS a password. Said as a plain
    // "Active" rather than left blank, so an empty cell never has to be guessed at.
    if (!state) return <Badge variant="outline">Active</Badge>;
    if (state.invite === 'valid') {
      return (
        <Badge variant="secondary" title={state.expiresAt ? 'Link expires ' + new Date(state.expiresAt).toLocaleString() : undefined}>
          Invited
        </Badge>
      );
    }
    if (state.invite === 'expired') return <Badge variant="destructive">Invite expired</Badge>;
    return <Badge variant="destructive">Not invited</Badge>;
  };

  // size: 'sm' in the table row; 'touch' on the phone cards (40px, a comfortable finger target).
  const rowActions = (row: any, size: 'sm' | 'touch') => {
    const box = size === 'touch' ? 'h-10 w-10' : 'h-8 w-8';
    return (
      <div className="flex items-center justify-end gap-0.5">
        {config.invites && inviteState.has(Number(row.id)) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(box, 'text-muted-foreground hover:text-foreground')}
            title={inviteState.get(Number(row.id))?.invite === 'valid' ? 'Send the invitation again (the current link stops working)' : 'Send an invitation to set a password'}
            aria-label="Send invite"
            disabled={invite.isPending}
            onClick={() => invite.mutate(Number(row.id))}
          >
            <MailPlus className="h-4 w-4" />
          </Button>
        )}
        {size === 'sm' && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(box, 'text-muted-foreground hover:text-foreground')}
            title="View"
            aria-label="View"
            onClick={() => navigate(`${base}/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(box, 'text-muted-foreground hover:text-foreground')}
          title="Edit"
          aria-label="Edit"
          onClick={() => navigate(`${base}/${row.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(box, 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}
          title="Delete"
          aria-label="Delete"
          onClick={() => setToDelete({ id: row.id })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // On a phone a row is a card: its first readable text column is the title (not the id, which
  // becomes a small "#12"), and the next few columns are label/value pairs. Every column would make
  // each card a page long; the full record is one tap away.
  const titleColumn =
    config.columns.find((c) => c.name !== 'id' && ['text', 'email', 'url', 'enum'].includes(c.kind) && !c.list) ??
    config.columns.find((c) => c.name !== 'id') ??
    config.columns[0];
  const cardDetails = config.columns.filter((c) => c !== titleColumn && c.name !== 'id').slice(0, 4);

  // @container: cards or table is decided by the width THIS list actually has, not the screen's —
  // a tablet with the sidebar open leaves the list phone-narrow on a wide screen.
  return (
    <div className="@container space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{config.labelPlural}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'record' : 'records'}
          </p>
        </div>
        {canAdd ? (
          <Button className="shrink-0" onClick={() => navigate(`${base}/new`)}>
            <Plus className="h-4 w-4" /> Add<span className="hidden sm:inline"> {config.label}</span>
          </Button>
        ) : (
          <p className="max-w-[16rem] text-right text-xs text-muted-foreground">
            Organizations add {config.labelPlural.toLowerCase()}. As platform admin you can view them.
          </p>
        )}
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${config.labelPlural.toLowerCase()}…`}
          className="pl-9"
        />
      </div>

      {/* Phones: one card per record. */}
      <ul className="space-y-3 @3xl:hidden" aria-label={config.labelPlural}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-3 rounded-xl border bg-card p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))
        ) : rows.length === 0 ? (
          <li className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No {config.labelPlural.toLowerCase()} found.
          </li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="rounded-xl border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => navigate(`${base}/${row.id}`)}
                className="block w-full rounded-t-xl p-4 text-left transition-colors active:bg-accent/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-semibold leading-snug">
                    {titleColumn ? renderCell(titleColumn, row[titleColumn.name]) : '#' + row.id}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{row.id}</span>
                </div>
                {cardDetails.length > 0 && (
                  <dl className="mt-3 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                    {cardDetails.map((col) => (
                      <div key={col.name} className="contents">
                        <dt className="truncate text-muted-foreground">{col.label}</dt>
                        <dd className="min-w-0 break-words">{renderCell(col, row[col.name])}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </button>
              <div className="flex items-center justify-between gap-2 border-t px-2 py-1">
                <div className="pl-2">{config.invites && inviteBadge(row)}</div>
                {rowActions(row, 'touch')}
              </div>
            </li>
          ))
        )}
      </ul>

      {/* A list at least 48rem wide: the table. */}
      <div className="hidden rounded-xl border bg-card @3xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.name}>
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort(col.name)}
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </TableHead>
              ))}
              {config.invites && <TableHead>Sign-in</TableHead>}
              {/* Pinned right, so a wide table that scrolls never hides its actions. */}
              <TableHead className="sticky right-0 w-[132px] bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {config.columns.map((c) => (
                    <TableCell key={c.name}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.columns.length + (config.invites ? 2 : 1)} className="h-32 text-center text-muted-foreground">
                  No {config.labelPlural.toLowerCase()} found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`${base}/${row.id}`)}
                >
                  {config.columns.map((col) => (
                    <TableCell key={col.name}>{renderCell(col, row[col.name])}</TableCell>
                  ))}
                  {config.invites && <TableCell>{inviteBadge(row)}</TableCell>}
                  <TableCell className="sticky right-0 bg-card" onClick={(e) => e.stopPropagation()}>{rowActions(row, 'sm')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page + 1} of {pageCount}
          {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </span>
        {/* Circular page numbers — active page is a filled primary disc. */}
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page + 1, pageCount).map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`ellipsis-${i}`}
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page + 1 ? 'page' : undefined}
                onClick={() => setPage(p - 1)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full text-sm font-medium tabular-nums transition-colors',
                  p === page + 1
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {config.label}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
