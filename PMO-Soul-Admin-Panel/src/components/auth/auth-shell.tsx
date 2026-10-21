import type { ReactNode } from 'react';
import { CheckCircle2, Database, Workflow, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export const APP_NAME = 'another test PMO';

/** Small theme toggle, matching the Soul auth screens (top-right). */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** App lockup — logo (if configured) on a light chip + name; works on the brand panel. */
export function BrandMark({ onDark = false }: { onDark?: boolean }) {
  const logo = (import.meta.env.VITE_BRAND_ICON_URL ||
    import.meta.env.VITE_BRAND_LOGO_URL) as string | undefined;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid h-10 w-10 place-items-center overflow-hidden rounded-xl',
          onDark ? 'bg-white shadow-sm ring-1 ring-black/5' : 'bg-brand text-brand-foreground'
        )}
      >
        {logo ? (
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <Database className={cn('h-5 w-5', onDark ? 'text-brand' : 'text-brand-foreground')} />
        )}
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', onDark ? 'text-white' : 'text-foreground')}>
        {APP_NAME}
      </span>
    </div>
  );
}

interface AuthShellProps {
  /** The form panel's heading, e.g. "Sign in". */
  title: ReactNode;
  /** The sentence under it. */
  description: ReactNode;
  /** Optional mark above the heading (a state icon on the reset screens). */
  icon?: ReactNode;
  /** The showcase panel's headline and sentence; sign-in's welcome when left out. */
  headline?: ReactNode;
  tagline?: ReactNode;
  /** The small centred line under the form. */
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthShell({ title, description, icon, headline, tagline, footer, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground lg:p-4">
      {/* Theme toggle — persistent, top-right */}
      <div className="absolute right-5 top-5 z-30 lg:right-7 lg:top-7">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.08fr_1fr] lg:gap-4">
        {/* ── Showcase panel ── */}
        <aside className="relative hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-brand to-brand-2 text-brand-foreground lg:flex lg:flex-col">
          <div className="animate-aurora-a pointer-events-none absolute -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-white/20 blur-[140px]" aria-hidden />
          <div className="animate-aurora-b pointer-events-none absolute -bottom-36 right-0 h-[420px] w-[420px] rounded-full bg-black/10 blur-[140px]" aria-hidden />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <div className="w-fit rounded-2xl bg-white/[0.08] px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <BrandMark onDark />
            </div>

            <div>
              <h1 className="max-w-md text-[32px] font-semibold leading-[1.12] tracking-tight xl:text-[38px]">
                {headline ?? (
                  <>
                    Welcome back to <span className="text-white">{APP_NAME}</span>.
                  </>
                )}
              </h1>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-brand-foreground/80">
                {tagline ?? 'Sign in to manage your data, automate workflows, and keep your team moving.'}
              </p>

              <div className="relative mt-10 h-[248px] w-full max-w-[460px]">
                {/* records card */}
                <div className="animate-float absolute left-0 top-0 z-10 w-[228px] rounded-[18px] border border-white/10 bg-white/[0.06] p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-white/10">
                      <Database className="size-3.5" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Records</span>
                  </div>
                  <div className="space-y-1.5">
                    {['Active', 'Synced', 'Secure'].map((label) => (
                      <div key={label} className="flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-white/80">{label}</span>
                        <CheckCircle2 className="size-3.5 text-white/70" aria-hidden />
                      </div>
                    ))}
                  </div>
                </div>

                {/* workflow card */}
                <div className="animate-float absolute right-0 top-14 z-20 w-[210px] rounded-[18px] border border-white/[0.12] bg-white/[0.06] p-3.5 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-white/10">
                      <Workflow className="size-3.5" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Workflow</span>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/85">
                      When a record changes
                    </div>
                    <div className="ml-3 h-3 w-px bg-white/25" />
                    <div className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white/85">
                      Run an automation
                    </div>
                  </div>
                </div>

                {/* secure chip */}
                <div className="animate-float absolute bottom-0 left-6 z-30 rounded-[16px] border border-white/[0.12] bg-black/25 px-4 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Access</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-semibold">
                    <ShieldCheck className="size-4" aria-hidden /> Role-based &amp; secure
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-brand-foreground/45">
              <span>© {new Date().getFullYear()} {APP_NAME}</span>
              <span className="hidden items-center gap-1.5 xl:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> All systems operational
              </span>
            </div>
          </div>
        </aside>

        {/* ── Form panel ── */}
        <main className="relative flex items-center justify-center rounded-[28px] bg-card px-6 py-12 shadow-sm max-lg:bg-background max-lg:shadow-none sm:px-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandMark />
            </div>

            <div className="animate-rise">
              {icon && (
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <h2 className="text-[26px] font-semibold tracking-tight sm:text-3xl">{title}</h2>
              <p className="mb-8 mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>

              {children}

              {footer && (
                <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  {footer}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
