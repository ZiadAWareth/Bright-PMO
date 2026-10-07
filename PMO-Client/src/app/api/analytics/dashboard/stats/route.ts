import { NextResponse } from "next/server";
import {
  ACTIVE_PROJECT_STATUSES,
  CLOSED_PROJECT_STATUSES,
  compactNumber,
  countPendingApprovals,
  isOverdue,
  loadLatestEvm,
  loadOpenRisks,
  loadProjects,
  loadResourceUtilisation,
  loadTasks,
  summariseEarnedValue,
} from "@/lib/services/portfolio-analytics";

export const dynamic = "force-dynamic";

interface Metric {
  value: string;
  trend: string;
}

/**
 * @swagger
 * /api/analytics/dashboard/stats:
 *   get:
 *     summary: Portfolio KPI figures for the analytics dashboard
 *     description: >
 *       Headline delivery, cost and risk metrics aggregated across every
 *       non-archived project. Earned-value figures use the EVM table where a
 *       project has reporting rows and fall back to budget x progress otherwise;
 *       `basis` reports which was used.
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: KPI figures
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const now = new Date();

    const [projects, evmByProject, tasks, riskData, approvals, resources] =
      await Promise.all([
        loadProjects(),
        loadLatestEvm(),
        loadTasks(),
        loadOpenRisks(now),
        countPendingApprovals(),
        loadResourceUtilisation(now),
      ]);

    const active = projects.filter((p) =>
      ACTIVE_PROJECT_STATUSES.includes(p.status),
    );
    const closed = projects.filter((p) =>
      CLOSED_PROJECT_STATUSES.includes(p.status),
    );
    const onHold = projects.filter((p) => p.status === "on_hold");

    // Earned value is measured over projects still in flight — finished work
    // would otherwise drag SPI toward 1.0 forever and hide live slippage.
    const ev = summariseEarnedValue(active, evmByProject, now);

    const portfolioValue = projects.reduce((s, p) => s + (p.budget_amount || 0), 0);
    const actualCost = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);
    const committed = projects.reduce((s, p) => s + (p.allocated_cost || 0), 0);
    const budgetUsedPct =
      portfolioValue > 0 ? (actualCost / portfolioValue) * 100 : null;

    const overdueTasks = tasks.filter((t) => isOverdue(t, now));
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const criticalOverdue = overdueTasks.filter((t) => t.is_critical_path);
    const taskCompletionPct =
      tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : null;

    const stats: Record<string, Metric> = {
      portfolioValue: {
        value: compactNumber(portfolioValue),
        trend: `${projects.length} project${projects.length === 1 ? "" : "s"} · ${active.length} in flight`,
      },
      actualCost: {
        value: compactNumber(actualCost),
        trend:
          budgetUsedPct === null
            ? "No approved budget on file"
            : `${budgetUsedPct.toFixed(1)}% of approved budget · ${compactNumber(committed)} committed`,
      },
      scheduleIndex: {
        value: ev.spi === null ? "—" : ev.spi.toFixed(2),
        trend:
          ev.spi === null
            ? "No scheduled work to measure"
            : ev.spi >= 1
              ? `Ahead of plan · ${compactNumber(ev.ev)} earned`
              : `Behind plan · ${compactNumber(ev.pv - ev.ev)} of value short`,
      },
      costIndex: {
        value: ev.cpi === null ? "—" : ev.cpi.toFixed(2),
        trend:
          ev.cpi === null
            ? "No cost booked yet"
            : ev.cpi >= 1
              ? `Under cost · ${compactNumber(ev.ev - ev.ac)} favourable`
              : `Over cost · ${compactNumber(ev.ac - ev.ev)} adverse`,
      },
      openRisks: {
        value: riskData.counts.total.toLocaleString(),
        trend: `${riskData.counts.high} high · ${riskData.counts.escalated} escalated`,
      },
      overdueTasks: {
        value: overdueTasks.length.toLocaleString(),
        trend:
          overdueTasks.length === 0
            ? "Nothing past due"
            : `${criticalOverdue.length} on the critical path`,
      },
      pendingApprovals: {
        value: approvals.total.toLocaleString(),
        trend:
          approvals.total === 0
            ? "Queue is clear"
            : `${approvals.gates} project gate${approvals.gates === 1 ? "" : "s"} · ${approvals.generic} other`,
      },
      resourceUtilisation: {
        value:
          resources.allocatedPct === null
            ? "—"
            : `${resources.allocatedPct.toFixed(0)}%`,
        trend:
          resources.totalResources === 0
            ? "No resources on file"
            : `${resources.assignedResources} of ${resources.totalResources} assigned today`,
      },
      taskCompletion: {
        value:
          taskCompletionPct === null ? "—" : `${taskCompletionPct.toFixed(0)}%`,
        trend: `${completedTasks.length} of ${tasks.length} tasks complete`,
      },
    };

    return NextResponse.json({
      generatedAt: now.toISOString(),
      stats,
      earnedValue: {
        bac: ev.bac,
        pv: ev.pv,
        ev: ev.ev,
        ac: ev.ac,
        spi: ev.spi,
        cpi: ev.cpi,
        // Lets the UI be honest about where the numbers came from.
        basis:
          ev.measuredProjects > 0 && ev.derivedProjects > 0
            ? "mixed"
            : ev.measuredProjects > 0
              ? "evm"
              : "derived",
        measuredProjects: ev.measuredProjects,
        derivedProjects: ev.derivedProjects,
      },
      counts: {
        projects: projects.length,
        active: active.length,
        closed: closed.length,
        onHold: onHold.length,
        tasks: tasks.length,
        overdueTasks: overdueTasks.length,
        openRisks: riskData.counts.total,
      },
    });
  } catch (error) {
    console.error("analytics/dashboard/stats failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard statistics" },
      { status: 500 },
    );
  }
}
