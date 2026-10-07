"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Gauge,
  ListChecks,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Sparkline } from "@/components/dashboard/charts/ChartPrimitives";
import type { ChartsResponse, StatKey, StatsResponse } from "./types";

type SparkSource = "completed" | "due";

interface HeroDef {
  key: StatKey;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sparkSource?: SparkSource;
  sparkColor?: string;
}

const HERO_CARDS: HeroDef[] = [
  {
    key: "portfolioValue",
    label: "Portfolio value",
    icon: Wallet,
    iconBg: "bg-bright-soft ",
    iconColor: "text-bright-primary",
  },
  {
    key: "actualCost",
    label: "Actual cost",
    icon: TrendingUp,
    iconBg: "bg-accent-indigo-soft ",
    iconColor: "text-accent-indigo ",
  },
  {
    key: "scheduleIndex",
    label: "Schedule index (SPI)",
    icon: Gauge,
    iconBg: "bg-info-soft ",
    iconColor: "text-info ",
    sparkSource: "completed",
    sparkColor: "var(--chart-6)",
  },
  {
    key: "costIndex",
    label: "Cost index (CPI)",
    icon: Gauge,
    iconBg: "bg-success-soft ",
    iconColor: "text-success ",
    sparkSource: "due",
    sparkColor: "var(--success)",
  },
];

const SECONDARY_CARDS: {
  key: StatKey;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "openRisks",
    label: "Open risks",
    icon: AlertTriangle,
    iconBg: "bg-danger-soft ",
    iconColor: "text-danger ",
  },
  {
    key: "overdueTasks",
    label: "Overdue tasks",
    icon: Clock,
    iconBg: "bg-warning-soft ",
    iconColor: "text-warning",
  },
  {
    key: "pendingApprovals",
    label: "Pending approvals",
    icon: ClipboardCheck,
    iconBg: "bg-surface-2 ",
    iconColor: "text-muted ",
  },
  {
    key: "resourceUtilisation",
    label: "Resource load",
    icon: Users,
    iconBg: "bg-accent-violet-soft ",
    iconColor: "text-accent-violet ",
  },
];

/**
 * Headline KPIs. The two index cards (SPI/CPI) carry a badge showing whether
 * the value is favourable, because "0.96" means nothing without knowing which
 * side of 1.00 is good.
 */
export function KpiBand({
  stats,
  charts,
  loading,
}: {
  stats: StatsResponse | null;
  charts: ChartsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <>
        <SkeletonRow count={4} tall />
        <SkeletonRow count={4} />
      </>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        Unable to load portfolio statistics.
      </div>
    );
  }

  const sparkSeries: Record<SparkSource, number[]> = {
    completed: charts?.deliveryTrend.map((p) => p.completed) ?? [],
    due: charts?.deliveryTrend.map((p) => p.due) ?? [],
  };

  const indexValue = (key: StatKey): number | null => {
    if (key === "scheduleIndex") return stats.earnedValue.spi;
    if (key === "costIndex") return stats.earnedValue.cpi;
    return null;
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {HERO_CARDS.map((card) => {
          const metric = stats.stats[card.key];
          const Icon = card.icon;
          const spark = card.sparkSource ? sparkSeries[card.sparkSource] : [];
          const index = indexValue(card.key);

          return (
            <div
              key={card.key}
              className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden="true" />
                </div>
                {index !== null && <IndexBadge value={index} />}
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {card.label}
                </div>
                <div className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-text-primary">
                  {metric.value}
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary" title={metric.trend}>
                  {metric.trend}
                </div>
              </div>

              {spark.length > 1 && (
                <div className="-mx-1 mt-3">
                  <Sparkline values={spark} color={card.sparkColor} height={42} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {SECONDARY_CARDS.map((card) => {
          const metric = stats.stats[card.key];
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="flex items-center gap-4 rounded-xl border border-border bg-bg-surface p-4 transition-shadow duration-200 hover:shadow-sm"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {card.label}
                </div>
                <div className="mt-0.5 text-xl font-semibold tabular-nums text-text-primary">
                  {metric.value}
                </div>
                <div className="truncate text-xs text-text-secondary" title={metric.trend}>
                  {metric.trend}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EarnedValueNote stats={stats} />
    </>
  );
}

/** SPI/CPI read against 1.00 — at or above is favourable. */
function IndexBadge({ value }: { value: number }) {
  const favourable = value >= 1;
  const cls = favourable
    ? "bg-success-soft text-success  "
    : "bg-danger-soft text-danger  ";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {favourable ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      )}
      {favourable ? "On/ahead" : "Behind"}
    </span>
  );
}

/**
 * States plainly whether the index figures came from recorded EVM rows or were
 * derived, so nobody reports a derived SPI as a measured one.
 */
function EarnedValueNote({ stats }: { stats: StatsResponse }) {
  const { basis, measuredProjects, derivedProjects, bac, ev, pv, ac } =
    stats.earnedValue;

  const label =
    basis === "evm"
      ? `Earned value from ${measuredProjects} recorded EVM reporting row${measuredProjects === 1 ? "" : "s"}.`
      : basis === "mixed"
        ? `Earned value from ${measuredProjects} recorded EVM row${measuredProjects === 1 ? "" : "s"}; ${derivedProjects} project${derivedProjects === 1 ? "" : "s"} derived from budget × progress.`
        : `No EVM reporting rows on file — SPI and CPI derived from budget × progress across ${derivedProjects} active project${derivedProjects === 1 ? "" : "s"}.`;

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-bg-surface-alt/60 px-4 py-2.5 text-xs text-text-secondary">
      <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <span className="tabular-nums opacity-80">
        BAC {money(bac)} · PV {money(pv)} · EV {money(ev)} · AC {money(ac)}
      </span>
    </p>
  );
}

function SkeletonRow({ count, tall }: { count: number; tall?: boolean }) {
  return (
    <div
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 ${tall ? "" : "mt-5"}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`rounded-2xl border border-border bg-bg-surface p-5 ${tall ? "h-[180px]" : "h-[88px]"}`}
        >
          <div className="h-full w-full animate-pulse rounded-lg bg-bg-surface-alt opacity-60" />
        </div>
      ))}
    </div>
  );
}
