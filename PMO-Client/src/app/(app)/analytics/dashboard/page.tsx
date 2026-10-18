"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/features/analytics/dashboard/components/DashboardHeader";
import { DeliveryPulse } from "@/features/analytics/dashboard/components/DeliveryPulse";
import { KpiBand } from "@/features/analytics/dashboard/components/KpiBand";
import { DashboardCharts } from "@/features/analytics/dashboard/components/DashboardCharts";
import { QuickActions } from "@/features/analytics/dashboard/components/QuickActions";
import { RecentActivity } from "@/features/analytics/dashboard/components/RecentActivity";
import { useAnalyticsDashboard } from "@/features/analytics/dashboard/hooks/useAnalyticsDashboard";

/**
 * Analytics dashboard — a thin orchestrator over `/api/analytics/dashboard/*`.
 *
 * Every figure on this screen is aggregated from live PMO records (projects,
 * WBS, tasks, budgets, risks, resources, approvals); see
 * `lib/services/portfolio-analytics.ts` for how each one is derived.
 */
export default function AnalyticsDashboardPage() {
  const { stats, charts, pulse, activity, loading, refreshing, error, refresh } =
    useAnalyticsDashboard();

  return (
    <DashboardLayout hideHeader>
      <div className="space-y-8">
        <DashboardHeader
          generatedAt={stats?.generatedAt}
          refreshing={refreshing}
          onRefresh={refresh}
        />

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-bright-danger/30 bg-bright-danger/10 px-5 py-4 text-sm text-bright-danger"
          >
            {error}
          </div>
        )}

        <DeliveryPulse data={pulse} loading={loading} />

        <KpiBand stats={stats} charts={charts} loading={loading} />

        <DashboardCharts data={charts} loading={loading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <QuickActions />
          <RecentActivity data={activity} loading={loading} />
        </div>
      </div>
    </DashboardLayout>
  );
}
