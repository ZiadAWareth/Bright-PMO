'use client';

import { BarChart3 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/entity-card';

/**
 * Interactive analytics dashboards.
 *
 * notConnected: until a dashboard source is integrated this shows an empty
 * state.
 */
export default function DynamicDashboard() {
  return (
    <DashboardLayout
      title="Dynamic Analytics Dashboard"
      subtitle="Interactive analytics and insights across your portfolio"
    >
      <EmptyState
        icon={<BarChart3 className="h-10 w-10" />}
        title="No dashboards connected yet"
        message="Interactive dashboards will appear here once a dashboard source is connected."
      />
    </DashboardLayout>
  );
}
