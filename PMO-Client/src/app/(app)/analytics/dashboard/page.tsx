"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/features/analytics/dashboard/components/DashboardHeader";
import { DeliveryPulse } from "@/features/analytics/dashboard/components/DeliveryPulse";
import { KpiBand } from "@/features/analytics/dashboard/components/KpiBand";
import { DashboardCharts } from "@/features/analytics/dashboard/components/DashboardCharts";
import { QuickActions } from "@/features/analytics/dashboard/components/QuickActions";
import { RecentActivity } from "@/features/analytics/dashboard/components/RecentActivity";
import { notConnected } from "@/lib/not-connected";
import type {
  ActivityResponse,
  ChartsResponse,
  PulseResponse,
  StatsResponse,
} from "@/features/analytics/dashboard/components/types";

/**
 * Analytics dashboard — a thin orchestrator over the dashboard sections.
 *
 * notConnected: stats, charts, delivery pulse and recent activity would be
 * aggregated by the backend from projects, WBS, tasks, budgets, risks,
 * resources and approvals. Until then every section shows its empty state.
 */
const stats: StatsResponse | null = null;
const charts: ChartsResponse | null = null;
const pulse: PulseResponse | null = null;
const activity: ActivityResponse | null = null;

export default function AnalyticsDashboardPage() {
  const loading = false;
  const refreshing = false;
  const error: string | null = null;
  const refresh = () => notConnected("Refreshing the dashboard");

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
