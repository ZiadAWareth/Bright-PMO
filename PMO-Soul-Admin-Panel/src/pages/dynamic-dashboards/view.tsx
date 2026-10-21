import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, KeyRound, LayoutGrid, Loader2, Maximize2, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardList, useEmbed } from './api';

/**
 * One Dynamic Dashboard, shown full width inside the app.
 *
 * The frame's address comes from the server for this person and this dashboard on every visit; it
 * is never stored in the page or in the browser. The engine page inside the frame renders the
 * dashboard; this page only adds the app's header: the dashboard switcher, refresh and full screen.
 */

const DEFAULT_HEIGHT = 760;

function Notice({ icon: Icon, title, body, action }: { icon: typeof LayoutGrid; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function DynamicDashboardView() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const list = useDashboardList();
  const embed = useEmbed(id);
  const [loaded, setLoaded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const frameBox = useRef<HTMLDivElement>(null);

  const entry = list.data?.dashboards.find((d) => d.id === id);
  const manages = Boolean(list.data?.canManage);
  const title = entry?.title || (embed.data && 'title' in embed.data ? embed.data.title : '') || 'Dashboard';

  // Show the loading cover only when the frame really reloads: a new address or a manual refresh.
  // (A background refetch returns an equal address, the frame does not reload, and a cover that
  // waited for onLoad would never lift.)
  const frameSrc = embed.data?.state === 'ready' ? embed.data.src : '';
  useEffect(() => {
    setLoaded(false);
  }, [frameSrc, frameKey]);

  const refresh = async () => {
    await embed.refetch();
    setFrameKey((k) => k + 1);
  };

  const fullScreen = () => {
    const request = frameBox.current?.requestFullscreen?.();
    request?.catch(() => undefined);
  };

  const result = embed.data;
  const others = list.data?.dashboards ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/analytics/dynamic-dashboards" aria-label="All dashboards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {others.length > 1 && (
            <Select value={String(id)} onValueChange={(v) => navigate(`/analytics/dynamic-dashboards/${v}`)}>
              <SelectTrigger className="h-9 w-56" aria-label="Switch dashboard">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {others.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={refresh} disabled={embed.isFetching} aria-label="Refresh dashboard">
            <RefreshCw className={embed.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          {result?.state === 'ready' && (
            <Button variant="outline" size="icon" onClick={fullScreen} aria-label="Full screen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {embed.isLoading ? (
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      ) : embed.isError ? (
        <Notice
          icon={AlertTriangle}
          title="This dashboard is not available"
          body="It may have been removed from the list, or your role cannot open it."
          action={
            <Button variant="outline" asChild>
              <Link to="/analytics/dynamic-dashboards">Back to dashboards</Link>
            </Button>
          }
        />
      ) : result?.state === 'ready' ? (
        <div ref={frameBox} className="relative overflow-hidden rounded-xl border bg-card">
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center bg-card" aria-hidden>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <iframe
            key={`${id}-${frameKey}`}
            src={result.src}
            title={title}
            onLoad={() => setLoaded(true)}
            className="block w-full"
            style={{ height: result.height || DEFAULT_HEIGHT, minHeight: 480 }}
            // The engine page needs its own scripts and same-origin access to the engine API.
            // It gets nothing else: no top-level navigation of this app, no access to its storage.
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms"
            allow="fullscreen"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : result?.state === 'needs_token' ? (
        <Notice
          icon={KeyRound}
          title="This dashboard has no embed token yet"
          body={
            manages
              ? 'In the Dashboard Engine, open the dashboard, click Embed, add an embed token and copy the code. Then edit this dashboard and paste the new code.'
              : 'Your administrator needs to finish setting it up.'
          }
          action={
            manages ? (
              <Button variant="outline" asChild>
                <Link to="/analytics/dynamic-dashboards">Go to the dashboard list</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Notice
          icon={Unplug}
          title={result?.state === 'org_disabled' ? "Your organization doesn't use dashboards" : "Dashboards aren't available right now"}
          body={
            result?.state === 'org_disabled'
              ? "Ask your organization's administrator if you need them."
              : 'The app is not connected to the Dashboard Engine at the moment.'
          }
        />
      )}
    </div>
  );
}
