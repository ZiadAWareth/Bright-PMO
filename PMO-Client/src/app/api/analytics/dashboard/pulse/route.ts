import { NextResponse } from "next/server";
import {
  ACTIVE_PROJECT_STATUSES,
  countPendingApprovals,
  isDueSoon,
  isOverdue,
  loadOpenRisks,
  loadProjects,
  loadTasks,
  plannedProgressPct,
} from "@/lib/services/portfolio-analytics";

export const dynamic = "force-dynamic";

/** How far ahead "due soon" looks. */
const DUE_SOON_DAYS = 14;

/**
 * @swagger
 * /api/analytics/dashboard/pulse:
 *   get:
 *     summary: Delivery pulse for the analytics dashboard
 *     description: >
 *       Budget-weighted portfolio progress against plan, plus the blocking
 *       items a PMO acts on first - overdue tasks, milestones due, approvals
 *       waiting and high risks open.
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Delivery pulse
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const now = new Date();

    const [projects, tasks, riskData, approvals] = await Promise.all([
      loadProjects(),
      loadTasks(),
      loadOpenRisks(now),
      countPendingApprovals(),
    ]);

    const active = projects.filter((p) =>
      ACTIVE_PROJECT_STATUSES.includes(p.status),
    );

    // Progress is budget-weighted: a 22M project slipping matters more than a
    // 1M one, and a plain average would hide that.
    const weighted = active.reduce(
      (acc, p) => {
        const weight = p.budget_amount || 0;
        if (weight <= 0) return acc;
        acc.weight += weight;
        acc.actual += weight * ((p.progress_percentage || 0) / 100);
        const planned = plannedProgressPct(p, now);
        if (planned !== null) {
          acc.plannedWeight += weight;
          acc.planned += weight * (planned / 100);
        }
        return acc;
      },
      { weight: 0, actual: 0, planned: 0, plannedWeight: 0 },
    );

    const actualPct = weighted.weight > 0 ? (weighted.actual / weighted.weight) * 100 : null;
    const plannedPct =
      weighted.plannedWeight > 0
        ? (weighted.planned / weighted.plannedWeight) * 100
        : null;

    const overdueTasks = tasks.filter((t) => isOverdue(t, now));
    const dueSoonTasks = tasks.filter((t) => isDueSoon(t, now, DUE_SOON_DAYS));
    const milestonesDueSoon = dueSoonTasks.filter((t) => t.is_milestone);
    const criticalOverdue = overdueTasks.filter((t) => t.is_critical_path);

    // Nearest planned finish among live projects — the next real deadline.
    const nextDeadline = active
      .filter((p) => p.planned_end_date)
      .map((p) => ({ name: p.name, date: p.planned_end_date! }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    const projectsBehind = active.filter((p) => {
      const planned = plannedProgressPct(p, now);
      return planned !== null && (p.progress_percentage || 0) < planned - 5;
    });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      progress: {
        actualPct: actualPct === null ? null : Number(actualPct.toFixed(1)),
        plannedPct: plannedPct === null ? null : Number(plannedPct.toFixed(1)),
        variancePct:
          actualPct === null || plannedPct === null
            ? null
            : Number((actualPct - plannedPct).toFixed(1)),
        basis: "budget-weighted",
      },
      activeProjects: active.length,
      projectsBehind: projectsBehind.length,
      nextDeadline: nextDeadline
        ? {
            name: nextDeadline.name,
            date: nextDeadline.date.toISOString(),
            daysRemaining: Math.round(
              (nextDeadline.date.getTime() - now.getTime()) / 86_400_000,
            ),
          }
        : null,
      blockers: {
        overdueTasks: overdueTasks.length,
        criticalOverdue: criticalOverdue.length,
        milestonesDueSoon: milestonesDueSoon.length,
        dueSoonTasks: dueSoonTasks.length,
        pendingApprovals: approvals.total,
        approvalGates: approvals.gates,
        highRisks: riskData.counts.high,
        escalatedRisks: riskData.counts.escalated,
        risksOverdueReview: riskData.counts.overdueReview,
      },
      dueSoonWindowDays: DUE_SOON_DAYS,
    });
  } catch (error) {
    console.error("analytics/dashboard/pulse failed:", error);
    return NextResponse.json(
      { error: "Failed to load delivery pulse" },
      { status: 500 },
    );
  }
}
