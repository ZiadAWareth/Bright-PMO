import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Bell, CheckCheck, ArrowUpRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';
import { recordPath } from '@/lib/record-routes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

// Same origin the axios client uses. Empty string → same-origin, so io('/workflow')
// connects to this host's /workflow namespace; in prod VITE_API_URL points at the API.
const SOCKET_URL = import.meta.env.VITE_API_URL ?? '';

interface NotificationRow {
  id: string;
  userId: string;
  title: string;
  message: string | null;
  level: string;
  isRead: boolean;
  entityName: string | null;
  entityRecordId: string | null;
  createdAt: string;
}

// Left accent per severity — kept on the design tokens (teal brand, semantic dot).
const LEVEL_DOT: Record<string, string> = {
  info: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-destructive',
};

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const res = await api.get('/api/notifications/unread-count');
      return res.data?.count ?? 0;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    enabled: !!user,
    queryFn: async (): Promise<NotificationRow[]> => {
      const res = await api.get('/api/notifications?limit=20');
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: refresh,
  });

  // A notification about a record opens that record (Link entity / Link record id on the
  // notification step, or the record the workflow ran on). Others just get marked read.
  const openNotification = (n: NotificationRow) => {
    if (!n.isRead) markRead.mutate(n.id);
    const to = recordPath(n.entityName, n.entityRecordId);
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/api/notifications/read-all'),
    onSuccess: refresh,
  });

  // Live delivery: the gateway authenticates the handshake and emits only into
  // this user's room, so the payload no longer reaches anyone else. The event is
  // still used only as a refresh signal — the inbox is re-fetched from the
  // auth-guarded, tenant-scoped API rather than trusting the wire payload as
  // data. The userId check is kept as a cheap second line of defence; userId is
  // a string on the record but a number in the JWT.
  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(`${SOCKET_URL}/workflow`, {
      transports: ['websocket'],
      reconnection: true,
      // Callback form so a refreshed token is picked up on reconnect; a socket
      // with no valid token is refused by the gateway.
      auth: (cb: (data: { token: string | null }) => void) => cb({ token: getToken() }),
    });
    socket.on('workflow:update', (evt: { eventType?: string; payload?: any }) => {
      if (evt?.eventType !== 'notification.new') return;
      if (String(evt.payload?.userId) !== String(user.userId)) return;
      refresh();
      const to = recordPath(evt.payload?.entityName, evt.payload?.entityRecordId);
      toast(evt.payload?.title ?? 'New notification', {
        description: evt.payload?.message ?? undefined,
        action: to ? { label: 'Open', onClick: () => navigate(to) } : undefined,
      });
    });
    return () => {
      socket.off('workflow:update');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  if (!user) return null;

  const count = unread ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {count > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">You're all caught up</p>
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                title={recordPath(n.entityName, n.entityRecordId) ? 'Open the record' : undefined}
                className={cn(
                  'flex w-full gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/60',
                  !n.isRead && 'bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    LEVEL_DOT[n.level] ?? 'bg-primary',
                    n.isRead && 'opacity-30'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm text-foreground',
                      !n.isRead && 'font-semibold'
                    )}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    {recordPath(n.entityName, n.entityRecordId) ? (
                      <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                        · Open <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </span>
                    ) : null}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
