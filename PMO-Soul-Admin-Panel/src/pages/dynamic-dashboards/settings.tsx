import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Lock,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { type OrgPolicy, type OrgRow, type Overview, errorMessage, useOverview, useRefreshAll } from './api';

/**
 * Settings → Dashboard Engine.
 *
 * The app owner connects this app to the Dashboard Engine once and decides how organizations get
 * dashboards. An organization's administrator sees only their own organization: whether it uses
 * dashboards, and the switch to change that when the owner's policy allows it.
 */

const POLICY_COPY: Record<OrgPolicy, { label: string; help: string }> = {
  self_service: {
    label: 'Each organization decides',
    help: "Every organization's administrator turns dashboards on or off for their organization.",
  },
  owner_only: {
    label: 'Only I decide',
    help: "You turn dashboards on per organization. Their administrators can ask you from this page.",
  },
  automatic: {
    label: 'On for every organization',
    help: 'Every organization, including new ones, has dashboards. You can still turn one off.',
  },
};

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: Overview['connection']['status'] }) {
  if (status === 'connected')
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Connected
      </Badge>
    );
  if (status === 'pending')
    return (
      <Badge variant="outline" className="gap-1">
        <Clock3 className="h-3 w-3" aria-hidden /> Waiting for approval
      </Badge>
    );
  if (status === 'revoked') return <Badge variant="destructive">Disconnected by the engine</Badge>;
  return <Badge variant="secondary">Not connected</Badge>;
}

function OrgBadge({ org }: { org: OrgRow }) {
  if (org.enabled) return <Badge variant="success">On</Badge>;
  if (org.status === 'requested') return <Badge variant="outline">Requested</Badge>;
  return <Badge variant="secondary">Off</Badge>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function DashboardEngineSettings() {
  const { data, isLoading, isError } = useOverview();
  const refreshAll = useRefreshAll();
  const [engineUrl, setEngineUrl] = useState('');
  const [engineApiUrl, setEngineApiUrl] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEngineUrl((v) => v || data.connection.engineUrl || data.defaults?.engineUrl || '');
    setEngineApiUrl((v) => v || data.connection.engineApiUrl || data.defaults?.engineApiUrl || '');
  }, [data]);

  const onDone = (message?: string) => () => {
    if (message) toast.success(message);
    refreshAll();
  };

  const start = useMutation({
    mutationFn: async () =>
      (await api.post('/api/dashboard-engine/connection/start', { engineUrl, engineApiUrl })).data as { authorizeUrl: string },
    onSuccess: ({ authorizeUrl }) => window.location.assign(authorizeUrl),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const check = useMutation({
    mutationFn: async () => (await api.post('/api/dashboard-engine/connection/check', {})).data,
    onSuccess: onDone('Checked the connection.'),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const disconnect = useMutation({
    mutationFn: async () => (await api.delete('/api/dashboard-engine/connection')).data,
    onSuccess: () => {
      setConfirmDisconnect(false);
      onDone('Disconnected from the Dashboard Engine.')();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const setPolicy = useMutation({
    mutationFn: async (body: { policy: OrgPolicy; lockOptOut: boolean }) =>
      (await api.put('/api/dashboard-engine/connection/policy', body)).data,
    onSuccess: onDone('Saved.'),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const setOrg = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) =>
      (await api.put(`/api/dashboard-engine/organizations/${id}`, { enabled })).data,
    onSuccess: (_d, v) => onDone(v.enabled ? 'Dashboards turned on.' : 'Dashboards turned off.')(),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const requestOrg = useMutation({
    mutationFn: async (id: number) => (await api.post(`/api/dashboard-engine/organizations/${id}/request`, {})).data,
    onSuccess: onDone('Asked the app owner to turn on dashboards.'),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const connect = (e: FormEvent) => {
    e.preventDefault();
    if (!start.isPending) start.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-destructive">Could not load the Dashboard Engine settings. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const c = data.connection;
  const connected = c.status === 'connected';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Engine</h1>
          <p className="text-sm text-muted-foreground">
            {data.isOwner
              ? 'Connect this app to the Dashboard Engine and choose which organizations use its dashboards.'
              : 'Whether your organization uses dashboards from the Dashboard Engine.'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/analytics/dynamic-dashboards">
            <LayoutGrid className="h-4 w-4" aria-hidden /> Dynamic Dashboards
          </Link>
        </Button>
      </div>

      {/* ── The app's connection ── */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Connection</CardTitle>
            <CardDescription>
              {data.isOwner
                ? 'One connection for the whole app. The app proves who it is with its own key; no password or engine token is shared.'
                : 'The app owner manages the connection.'}
            </CardDescription>
          </div>
          <StatusBadge status={c.status} />
        </CardHeader>
        <CardContent className="space-y-5">
          {c.lastError && data.isOwner && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{c.lastError}</span>
            </div>
          )}

          {connected ? (
            <>
              <dl className="space-y-3">
                <Detail label="Dashboard Engine">
                  {c.engineUrl ? (
                    <a href={c.engineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                      {c.engineUrl} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : '—'}
                </Detail>
                <Detail label="Workspace">
                  {c.workspaceName || '—'}
                  {c.workspaceCreated && <span className="ml-2 text-xs font-normal text-muted-foreground">created for this app</span>}
                </Detail>
                {c.sharedProjectName && <Detail label="Shared project">{c.sharedProjectName}</Detail>}
                {data.isOwner && (
                  <Detail label="Connected">
                    {formatDate(c.connectedAt)}
                    {c.connectedByEmail ? ` by ${c.connectedByEmail}` : ''}
                  </Detail>
                )}
              </dl>
              {data.isOwner && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => check.mutate()} disabled={check.isPending}>
                    <RefreshCw className={check.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden /> Check connection
                  </Button>
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDisconnect(true)}>
                    <Unplug className="h-4 w-4" aria-hidden /> Disconnect
                  </Button>
                </div>
              )}
            </>
          ) : data.isOwner ? (
            <form onSubmit={connect} className="space-y-4">
              {c.status === 'pending' && (
                <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  A connection was started but not approved. Connect again to start over.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="de-url">Dashboard Engine address</Label>
                  <Input id="de-url" type="url" required value={engineUrl} onChange={(e) => setEngineUrl(e.target.value)} placeholder="https://dashboards.example.com" />
                  <p className="text-xs text-muted-foreground">Where people open the Dashboard Engine in their browser.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="de-api">Dashboard Engine API address</Label>
                  <Input id="de-api" type="url" required value={engineApiUrl} onChange={(e) => setEngineApiUrl(e.target.value)} placeholder="https://api.dashboards.example.com" />
                  <p className="text-xs text-muted-foreground">Where this app's server reaches the engine. Often a different address.</p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> What happens next
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>You sign in to the Dashboard Engine.</li>
                  <li>You choose a new workspace for this app, or one you already manage, and approve.</li>
                  <li>You come back here, connected.</li>
                </ol>
              </div>
              <Button type="submit" disabled={start.isPending || !engineUrl || !engineApiUrl} aria-busy={start.isPending}>
                {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlugZap className="h-4 w-4" aria-hidden />}
                Connect to the Dashboard Engine
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              This app is not connected yet. Ask the app owner to connect it under Settings → Dashboard Engine.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Organizations ── */}
      {data.isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizations</CardTitle>
            <CardDescription>Which organizations show Dynamic Dashboards to their people.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
              <div className="space-y-2">
                <Label htmlFor="de-policy">Who decides</Label>
                <Select
                  value={data.policy}
                  onValueChange={(v) => setPolicy.mutate({ policy: v as OrgPolicy, lockOptOut: v === 'automatic' ? data.lockOptOut : false })}
                  disabled={setPolicy.isPending}
                >
                  <SelectTrigger id="de-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(POLICY_COPY) as OrgPolicy[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {POLICY_COPY[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground md:pt-8">{POLICY_COPY[data.policy].help}</p>
            </div>
            {data.policy === 'automatic' && (
              <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div>
                  <Label htmlFor="de-lock" className="text-sm font-medium">Organizations can't turn dashboards off</Label>
                  <p className="text-xs text-muted-foreground">Only you can turn an organization off.</p>
                </div>
                <Switch
                  id="de-lock"
                  checked={data.lockOptOut}
                  disabled={setPolicy.isPending}
                  onCheckedChange={(v) => setPolicy.mutate({ policy: 'automatic', lockOptOut: v })}
                />
              </div>
            )}

            {data.organizations.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                This app has no organizations yet.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.organizations.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.status === 'requested' && o.requestedByEmail
                            ? `Requested by ${o.requestedByEmail}`
                            : o.changedByEmail
                              ? `Changed by ${o.changedByEmail} · ${formatDate(o.changedAt)}`
                              : 'Not changed yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrgBadge org={o} />
                      <Switch
                        checked={o.enabled}
                        disabled={setOrg.isPending}
                        onCheckedChange={(v) => setOrg.mutate({ id: o.id, enabled: v })}
                        aria-label={`Dashboards for ${o.name}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        data.organizations.map((o) => {
          const policy = data.policy;
          const locked = policy === 'automatic' && data.lockOptOut;
          return (
            <Card key={o.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div className="space-y-1.5">
                  <CardTitle className="text-base">{o.name}</CardTitle>
                  <CardDescription>Show Dynamic Dashboards to the people in your organization.</CardDescription>
                </div>
                <OrgBadge org={o} />
              </CardHeader>
              <CardContent className="space-y-3">
                {policy === 'owner_only' ? (
                  o.enabled ? (
                    <p className="text-sm text-muted-foreground">The app owner turned dashboards on for your organization.</p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {o.status === 'requested'
                          ? 'You asked the app owner. They decide which organizations use dashboards.'
                          : 'The app owner decides which organizations use dashboards.'}
                      </p>
                      <Button onClick={() => requestOrg.mutate(o.id)} disabled={requestOrg.isPending || o.status === 'requested'}>
                        {requestOrg.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                        {o.status === 'requested' ? 'Requested' : 'Ask the app owner'}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <div>
                      <Label htmlFor={`de-org-${o.id}`} className="text-sm font-medium">Use dashboards in {o.name}</Label>
                      <p className="text-xs text-muted-foreground">
                        {locked && o.enabled ? (
                          <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" aria-hidden /> The app owner turned this on for every organization.</span>
                        ) : (
                          'Turning it off hides Dynamic Dashboards from everyone in your organization. Your dashboard list is kept.'
                        )}
                      </p>
                    </div>
                    <Switch
                      id={`de-org-${o.id}`}
                      checked={o.enabled}
                      disabled={setOrg.isPending || (locked && o.enabled)}
                      onCheckedChange={(v) => setOrg.mutate({ id: o.id, enabled: v })}
                    />
                  </div>
                )}
                {o.enabled && connected && (
                  <Button variant="link" className="h-auto px-0" asChild>
                    <Link to="/analytics/dynamic-dashboards">
                      Manage your organization's dashboards <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={confirmDisconnect} onOpenChange={(v) => !disconnect.isPending && setConfirmDisconnect(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect from the Dashboard Engine?</DialogTitle>
            <DialogDescription>
              Dynamic Dashboards stop showing for everyone in this app. The dashboard list and organization settings are kept,
              so connecting again brings them back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDisconnect(false)} disabled={disconnect.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

