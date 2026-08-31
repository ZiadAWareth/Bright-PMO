"use client";

import {
  AreaChart,
  BarChart,
  ChartCard,
  compact,
  DivergingBarChart,
  DonutChart,
  DONUT_PALETTE,
  formatCount,
  GroupedBarChart,
} from "@/components/dashboard/charts/ChartPrimitives";
import type { ChartsResponse } from "./types";

const COMPLETED_COLOR = "var(--success)";
const DUE_COLOR = "var(--bright)";
const PLANNED_COLOR = "var(--info)";
const ACTUAL_COLOR = "var(--bright)";

/** Project status → colour, so the mix donut reads the same on every screen. */
const STATUS_COLORS: Record<string, string> = {
  planning: "var(--chart-6)",
  approved: "var(--accent-indigo)",
  execution: "var(--bright)",
  on_hold: "var(--warning)",
  completed: "var(--success)",
  closed: "var(--faint)",
  pending_approval: "var(--accent-violet)",
  rejected: "var(--danger)",
};

/* Severity ramp: red through amber to green, so a risk row reads by position
   in the ramp as well as by hue. */
const RISK_PALETTE = [
  "var(--danger)",
  "var(--chart-1)",
  "var(--warning)",
  "var(--chart-5)",
  "var(--success)",
];

export function DashboardCharts({
  data,
  loading,
}: {
  data: ChartsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[320px] animate-pulse rounded-2xl border border-border bg-bg-surface"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        Unable to load dashboard charts.
      </div>
    );
  }

  const deliveryEmpty = data.deliveryTrend.every((p) => p.completed === 0 && p.due === 0);
  const mixEmpty = data.portfolioMix.length === 0;
  const budgetEmpty = data.budgetByCostType.every((b) => b.planned === 0 && b.actual === 0);
  const riskEmpty = data.riskExposure.length === 0;
  // A pool with nobody allocated today has no bars worth drawing — say so
  // rather than render a row of zero-height bars against an empty axis.
  const resourceEmpty =
    data.resourceLoad.length === 0 ||
    data.resourceLoad.every((r) => r.allocationPct === 0);
  const resourcePoolSize = data.resourceLoad.reduce((s, r) => s + r.total, 0);
  const varianceEmpty = data.scheduleVariance.length === 0;

  const totalBudget = data.portfolioMix.reduce((s, p) => s + p.budget, 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ChartCard
        title="Delivery throughput"
        subtitle="Tasks completed vs tasks falling due · last 12 months"
        legend={[
          { label: "Completed", color: COMPLETED_COLOR },
          { label: "Due", color: DUE_COLOR },
        ]}
        empty={deliveryEmpty}
      >
        <AreaChart
          labels={data.deliveryTrend.map((p) => p.label)}
          series={[
            {
              label: "Completed",
              color: COMPLETED_COLOR,
              values: data.deliveryTrend.map((p) => p.completed),
            },
            {
              label: "Due",
              color: DUE_COLOR,
              values: data.deliveryTrend.map((p) => p.due),
            },
          ]}
          formatValue={formatCount}
        />
      </ChartCard>

      <ChartCard
        title="Portfolio mix by status"
        subtitle="Approved budget grouped by project status"
        empty={mixEmpty}
      >
        <DonutChart
          data={data.portfolioMix.map((p, i) => ({
            label: p.label,
            value: p.budget,
            color: STATUS_COLORS[p.status] ?? DONUT_PALETTE[i % DONUT_PALETTE.length],
            sub: `${p.count} · ${compact(p.budget)}`,
          }))}
          centerLabel="Total budget"
          centerValue={compact(totalBudget)}
        />
      </ChartCard>

      <ChartCard
        title="Budget vs actual"
        subtitle="Planned against booked spend by cost type"
        legend={[
          { label: "Planned", color: PLANNED_COLOR },
          { label: "Actual", color: ACTUAL_COLOR },
        ]}
        empty={budgetEmpty}
      >
        <GroupedBarChart
          data={data.budgetByCostType.map((b) => ({
            label: b.costType,
            values: [b.planned, b.actual],
            sub: `${b.variance >= 0 ? "+" : ""}${compact(b.variance)}`,
          }))}
          colors={[PLANNED_COLOR, ACTUAL_COLOR]}
          formatValue={compact}
        />
      </ChartCard>

      <ChartCard
        title="Schedule variance by project"
        subtitle="Reported progress against where the plan says it should be"
        empty={varianceEmpty}
        emptyLabel="No projects with a planned finish date"
      >
        <div className="py-1">
          <DivergingBarChart
            data={data.scheduleVariance.map((p) => ({
              label: p.name,
              value: p.variancePct,
              sub: `${p.actualPct}% of ${p.plannedPct}%`,
            }))}
            formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)} pts`}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="Risk exposure by category"
        subtitle="Open risks weighted by cumulative risk score"
        empty={riskEmpty}
        emptyLabel="No open risks on file"
      >
        <BarChart
          data={data.riskExposure.map((r, i) => ({
            label: r.category,
            value: r.totalScore,
            sub: `${r.count} open${r.high > 0 ? ` · ${r.high} high` : ""}`,
            color: RISK_PALETTE[i % RISK_PALETTE.length],
          }))}
          formatValue={formatCount}
        />
      </ChartCard>

      <ChartCard
        title="Resource load by type"
        subtitle="Average allocation across the pool from assignments active today"
        empty={resourceEmpty}
        emptyLabel={
          resourcePoolSize > 0
            ? `No assignments active today · ${resourcePoolSize} resources on the bench`
            : "No resources on file"
        }
      >
        <BarChart
          data={data.resourceLoad.map((r) => ({
            label: r.type,
            value: r.allocationPct,
            sub: `${r.assigned}/${r.total} assigned`,
            // Over 100% is over-allocation, and should read as a warning.
            color: r.allocationPct > 100 ? "var(--danger)" : "var(--accent-violet)",
          }))}
          formatValue={(v) => `${Math.round(v)}%`}
        />
      </ChartCard>
    </div>
  );
}
