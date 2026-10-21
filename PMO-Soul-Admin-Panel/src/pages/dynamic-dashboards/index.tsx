import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Globe,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Unplug,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDashboardDialog } from './add-dashboard-dialog';
import { type DashboardEntry, type DashboardList, errorMessage, useDashboardList, useOverview, useRemoveDashboard } from './api';

/**
 * Dynamic Dashboards — the dashboards from the Dashboard Engine this person can open.
 *
 * What a person sees here depends on three things, in order: whether the app is connected to the
 * engine (the app owner's job), whether their organization uses dashboards (their organization
 * administrator's choice), and which dashboards were added for them. Every empty state says which of
 * the three is missing and who can fix it, so nobody is left looking at a blank page.
 */

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof LayoutGrid; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function SettingsButton({ label }: { label: string }) {
  return (
    <Button asChild>
      <Link to="/settings/dashboard-engine">
        {label} <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  );
}

/** Which of the three conditions is missing, in the words of the person reading it. */
function StateMessage({ data }: { data: DashboardList }) {
  if (data.state === 'not_connected' || data.state === 'revoked') {
    const revoked = data.state === 'revoked';
    if (data.isOwner) {
      return (
        <EmptyState
          icon={Unplug}
          title={revoked ? 'The Dashboard Engine disconnected this app' : 'Connect the Dashboard Engine'}
          body={
            revoked
              ? 'Connect again to bring dashboards back. The dashboards in your list are kept.'
              : 'Connect this app once, then each organization can show its Dashboard Engine dashboards here.'
          }
          action={<SettingsButton label={revoked ? 'Reconnect' : 'Connect'} />}
        />
      );
    }
    return (
      <EmptyState
        icon={Unplug}
        title="Dashboards aren't set up yet"
        body={
          data.canManage
            ? 'The app owner needs to connect this app to the Dashboard Engine first.'
            : 'When your administrator sets up dashboards, they will appear here.'
        }
      />
    );
  }
  if (data.state === 'org_disabled' && !data.canManage) {
    return (
      <EmptyState
        icon={Building2}
        title="Your organization doesn't use dashboards"
        body="Ask your organization's administrator if you need them."
      />
    );
  }
  return null;
}

function AudienceBadge({ entry, isOwner }: { entry: DashboardEntry; isOwner: boolean }) {
  if (entry.organizationId === null) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Globe className="h-3 w-3" aria-hidden /> All organizations
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      <Building2 className="h-3 w-3" aria-hidden /> {isOwner ? entry.organizationName || 'One organization' : 'Your organization'}
    </Badge>
  );
}

export default function DynamicDashboards() {
  const { data, isLoading, isError } = useDashboardList();
  const owner = Boolean(data?.isOwner);
  const manages = Boolean(data?.canManage);
  // Only managers need the organization list (for "Show to"); owners get every organization.
  const overview = useOverview(manages);
  const [editing, setEditing] = useState<DashboardEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<DashboardEntry | null>(null);
  const remove = useRemoveDashboard();

  const connected = data?.state === 'ready' || data?.state === 'org_disabled';
  const dashboards = data?.dashboards ?? [];

  const confirmRemove = () => {
    if (!removing) return;
    remove.mutate(removing.id, {
      onSuccess: () => {
        toast.success(`Removed "${removing.title}" from the list.`);
        setRemoving(null);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dynamic Dashboards</h1>
            <p className="text-sm text-muted-foreground">Live dashboards from the Dashboard Engine</p>
          </div>
        </div>
        {manages && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/settings/dashboard-engine">
                <Settings2 className="h-4 w-4" aria-hidden /> Settings
              </Link>
            </Button>
            {connected && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Add dashboard
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[136px] rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm font-medium text-destructive">Could not load dashboards. Please try again.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {data.state === 'org_disabled' && data.canManage && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                Dashboards are off for your organization, so only administrators see this page.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/settings/dashboard-engine">Turn on</Link>
              </Button>
            </div>
          )}

          <StateMessage data={data} />

          {(data.state === 'ready' || (data.state === 'org_disabled' && data.canManage)) &&
            (dashboards.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title={manages ? 'No dashboards yet' : 'No dashboards for you yet'}
                body={
                  manages
                    ? 'Add a dashboard by pasting its embed code from the Dashboard Engine.'
                    : 'When dashboards are added for your organization, they will appear here.'
                }
                action={
                  manages ? (
                    <Button onClick={() => setAdding(true)}>
                      <Plus className="h-4 w-4" aria-hidden /> Add dashboard
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dashboards.map((d) => (
                  <Card key={d.id} className="group relative flex flex-col transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <LayoutGrid className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-semibold text-foreground">
                            <Link
                              to={`/analytics/dynamic-dashboards/${d.id}`}
                              className="outline-none after:absolute after:inset-0 after:content-['']"
                            >
                              {d.title}
                            </Link>
                          </h2>
                          {d.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>}
                        </div>
                        {d.canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="relative z-10 h-8 w-8" aria-label={`Options for ${d.title}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditing(d)}>
                                <Pencil className="h-4 w-4" aria-hidden /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setRemoving(d)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4" aria-hidden /> Remove from list
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-1.5">
                        {manages && <AudienceBadge entry={d} isOwner={owner} />}
                        {d.kind === 'widget' && <Badge variant="outline" className="font-normal">Single widget</Badge>}
                        {!d.hasAccessToken && (
                          <Badge variant="outline" className="gap-1 border-amber-500/40 font-normal text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" aria-hidden /> Needs an embed token
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
        </>
      )}

      {manages && (
        <AddDashboardDialog
          open={adding || Boolean(editing)}
          onOpenChange={(v) => {
            if (!v) {
              setAdding(false);
              setEditing(null);
            }
          }}
          entry={editing}
          isOwner={owner}
          organizations={overview.data?.organizations ?? []}
          engineUrl={data?.engineUrl ?? null}
        />
      )}

      <Dialog open={Boolean(removing)} onOpenChange={(v) => !v && !remove.isPending && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove "{removing?.title}"?</DialogTitle>
            <DialogDescription>
              It disappears from this app's sidebar for everyone it was shown to. The dashboard itself stays in the Dashboard Engine.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
