import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  GitBranch,
  LayoutTemplate,
  Loader2,
  MousePointer2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Handoff {
  code: string;
  expiresAt: string;
  appName: string;
  appUrl: string;
  builderUrl: string;
}

const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'this app';
// This app's own entities, baked in at generation time, so the preview shows what the user will
// actually find in the builder.
const ENTITIES: string[] = ["ApprovalPolicy","SprintSnapshot","Lesson","CommentMention"];

const FEATURES = [
  {
    icon: Database,
    title: 'Your real data, already wired',
    body: 'Every entity, field and relation in ' + APP_NAME + ' is in the builder from the first second. No API keys, no endpoints to map.',
  },
  {
    icon: MousePointer2,
    title: 'Drag, drop, publish',
    body: 'Lay out lists, detail views and forms visually. The builder generates the pages; you decide how they look.',
  },
  {
    icon: GitBranch,
    title: 'Workflows included',
    body: 'Buttons and forms can start the workflows you modelled here, so customer actions run the same process as your team.',
  },
];

export default function DesignFrontend() {
  const [error, setError] = useState<string | null>(null);
  // Set after a successful handoff: the builder opened in a new tab and this page stays usable.
  const [opened, setOpened] = useState(false);
  // The builder's tab, opened IN the click (a popup blocker allows only that) and pointed at the
  // builder once the one-time code arrives. Null when the browser refused the tab.
  const tab = useRef<Window | null>(null);

  // A new tab, so the admin panel stays where it is. The app's session is untouched: the builder's
  // server exchanges the one-time code with this app directly, so nothing here signs in or out.
  const openBuilder = () => {
    setError(null);
    setOpened(false);
    let win: Window | null = null;
    try {
      win = window.open('', '_blank');
      if (win) {
        win.document.title = 'Opening the UI Builder…';
        win.document.body.style.cssText = 'font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#475569';
        win.document.body.textContent = 'Opening the UI Builder…';
      }
    } catch {
      win = null;
    }
    tab.current = win;
    start.mutate();
  };

  const start = useMutation({
    mutationFn: async () => (await api.post('/api/frontend-design/handoff', {})).data as Handoff,
    onSuccess: (handoff) => {
      const closeTab = () => { try { tab.current?.close(); } catch { /* already closed */ } tab.current = null; };
      if (!handoff.builderUrl) {
        closeTab();
        // Configuration, not a bug in the click. Named precisely so whoever reads it knows which
        // variable to set rather than going looking in the code.
        setError('This app does not know where the UI Builder is. Set SOUL_BUILDER_URL and restart it.');
        return;
      }
      if (!handoff.appUrl) {
        closeTab();
        setError('This app does not know its own public address. Set APP_PUBLIC_URL and restart it.');
        return;
      }
      const url = new URL('/connect', handoff.builderUrl);
      url.searchParams.set('app', handoff.appUrl);
      // The code, never the token.
      url.searchParams.set('code', handoff.code);
      url.searchParams.set('name', handoff.appName);
      const win = tab.current;
      tab.current = null;
      if (win && !win.closed) {
        // The builder must not be able to reach back into the admin panel.
        try { win.opener = null; } catch { /* cross-origin already */ }
        win.location.href = url.toString();
        setOpened(true);
      } else {
        // The browser blocked the new tab: continue in this one rather than lose the code.
        window.location.href = url.toString();
      }
    },
    onError: (err: any) => {
      try { tab.current?.close(); } catch { /* already closed */ }
      tab.current = null;
      setError(err?.response?.data?.message ?? 'Could not start a design session. Check your connection and try again.');
    },
  });

  const busy = start.isPending;

  return (
    // Full-bleed (see app-layout: /design-frontend is not wrapped in the padded column), so the
    // page fills the whole content area and scrolls itself; no card inside the card.
    <div className="h-full overflow-auto">
      <div className="relative min-h-full overflow-hidden">
        {/* Atmosphere over the whole area: two slow brand-coloured glows on a faint dot grid. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-aurora-a absolute -left-24 -top-32 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
          <div className="animate-aurora-b absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-2/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
            style={{
              backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-10 p-6 sm:p-10 lg:p-12">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          {/* Copy + action */}
          <div className="animate-rise space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
              UI Builder · connected to <span className="font-semibold text-foreground">{APP_NAME}</span>
            </span>

            <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Design the pages your{' '}
              <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">customers</span>{' '}
              will see
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Open the UI Builder already connected to {APP_NAME}. Drag your real entities, fields and
              workflows onto a page and publish a customer-facing frontend, with nothing to configure.
            </p>

            <div className="space-y-3">
              <Button
                size="lg"
                className="group h-12 gap-2 px-6 text-base shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
                onClick={openBuilder}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Opening the builder…
                  </>
                ) : (
                  <>
                    Open the UI Builder
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </>
                )}
              </Button>

              {opened && (
                <p role="status" className="text-sm font-medium text-brand">
                  The UI Builder opened in a new tab. You can keep working here.
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                Secure one-time link, valid for two minutes. Your access token never appears in the address bar.
              </p>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Builder preview — a drawing of the product, not a control. */}
          <div aria-hidden className="animate-rise relative [animation-delay:120ms]">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl shadow-black/10 dark:shadow-black/40">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                  pages / home
                </span>
              </div>

              <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[132px_1fr]">
                {/* Palette */}
                <div className="space-y-2 border-r bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entities</p>
                  {ENTITIES.map((name, i) => (
                    <div
                      key={name}
                      className={
                        'flex items-center gap-1.5 truncate rounded-md border bg-background px-2 py-1.5 text-[11px] font-medium ' +
                        (i === 0 ? 'border-brand/40 text-brand ring-2 ring-brand/15' : 'text-foreground/80')
                      }
                    >
                      <Database className="h-3 w-3 shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocks</p>
                  <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-[11px] text-foreground/80">
                    <LayoutTemplate className="h-3 w-3 shrink-0" /> List
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative space-y-3 p-4">
                  <div className="h-3 w-2/5 rounded bg-foreground/10" />
                  <div className="h-2 w-3/5 rounded bg-foreground/5" />
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {[0, 1, 2, 3].map((n) => (
                      <div key={n} className="space-y-2 rounded-lg border bg-card p-2.5">
                        <div className="h-10 rounded-md bg-gradient-to-br from-brand/20 to-brand-2/10" />
                        <div className="h-1.5 w-3/4 rounded bg-foreground/10" />
                        <div className="h-1.5 w-1/2 rounded bg-foreground/5" />
                      </div>
                    ))}
                  </div>
                  {/* Drop zone the dragged entity is heading for */}
                  <div className="flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-brand/40 bg-brand/5 text-[11px] font-medium text-brand">
                    Drop {ENTITIES[0]} here
                  </div>

                  {/* The entity being dragged */}
                  <div className="animate-float absolute bottom-16 right-6 flex items-center gap-1.5 rounded-md border border-brand/50 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-brand shadow-lg">
                    <Database className="h-3 w-3" />
                    {ENTITIES[0]}
                    <MousePointer2 className="absolute -bottom-4 -right-3 h-4 w-4 fill-foreground text-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What you get ─────────────────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-3" aria-label="What the UI Builder does">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border bg-card/70 p-5 backdrop-blur transition-colors hover:border-brand/40">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
        </section>
        </div>
      </div>
    </div>
  );
}
