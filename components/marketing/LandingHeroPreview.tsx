import { Briefcase, Wallet, TrendingUp, CalendarCheck } from "lucide-react";

const KPIS = [
  { label: "Active projects", value: "48", Icon: Briefcase },
  { label: "Portfolio value", value: "312M", Icon: Wallet },
];

/** Planned vs earned value by month — decorative shape, not real data. */
const BARS = [38, 52, 44, 68, 58, 80, 66, 88, 74];

/**
 * Decorative "PMO command center" mock shown beside the hero on large screens.
 * Purely presentational — a frosted card stack hinting at the console.
 */
export function LandingHeroPreview() {
  return (
    <div className="relative">
      {/* Soft glow behind the card. */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-wujha-primary/20 blur-3xl"
      />

      <div className="rounded-3xl border border-border bg-bg-surface/90 p-5 shadow-2xl backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 pb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs font-medium text-text-secondary">
            PMO Console
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          {KPIS.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-bg-surface-alt/70 p-4"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-wujha-primary/10 text-wujha-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {value}
              </p>
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
          ))}
        </div>

        {/* Faux chart */}
        <div className="mt-3 rounded-2xl border border-border bg-bg-surface-alt/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">
              Planned vs earned value
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-wujha-primary">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> SPI 1.04
            </span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {BARS.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-md bg-gradient-to-t from-wujha-primary/40 to-wujha-primary"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Floating status chip — hangs off the card corner so it clears the chart. */}
        <div className="absolute -bottom-7 -right-6 flex animate-float-soft items-center gap-2.5 rounded-2xl border border-border bg-bg-surface p-3 shadow-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wujha-success/10 text-wujha-success">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-text-primary">
              Schedule on track
            </p>
            <p className="text-[0.7rem] text-text-secondary">
              12 milestones this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
