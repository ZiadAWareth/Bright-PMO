import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  humanise,
  isOverdue,
  loadOpenRisks,
  loadProjects,
  loadResourceUtilisation,
  loadTasks,
  monthKey,
  plannedProgressPct,
  recentMonths,
} from "@/lib/services/portfolio-analytics";

export const dynamic = "force-dynamic";

const TREND_MONTHS = 12;

/**
 * @swagger
 * /api/analytics/dashboard/charts:
 *   get:
 *     summary: Chart series for the analytics dashboard
 *     description: >
 *       Six series derived from live PMO data - delivery throughput, portfolio
 *       mix by status, budget against actual by cost type, risk exposure by
 *       category, resource load by type, and schedule variance by project.
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Chart series
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const now = new Date();

    const [projects, tasks, riskData, resources, budgets] = await Promise.all([
      loadProjects(),
      loadTasks(),
      loadOpenRisks(now),
      loadResourceUtilisation(now),
      prisma.budget.findMany({
        where: { project: { archived: false } },
        select: {
          cost_type: true,
          planned_amount: true,
          actual_amount: true,
        },
      }),
    ]);

    const months = recentMonths(TREND_MONTHS, now);

    // ── Delivery throughput: tasks completed vs tasks that fell due ──────────
    // "Due" counts every task whose end_date lands in the month, so a month
    // where the bars diverge is a month where the plan was missed.
    const completedByMonth = new Map<string, number>();
    const dueByMonth = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === "completed") {
        const finished = task.actual_end_date ?? task.end_date;
        const key = monthKey(finished);
        completedByMonth.set(key, (completedByMonth.get(key) ?? 0) + 1);
      }
      const dueKey = monthKey(task.end_date);
      dueByMonth.set(dueKey, (dueByMonth.get(dueKey) ?? 0) + 1);
    }

    const deliveryTrend = months.map((m) => ({
      label: m.label,
      monthKey: m.key,
      completed: completedByMonth.get(m.key) ?? 0,
      due: dueByMonth.get(m.key) ?? 0,
    }));

    // ── Portfolio mix by project status ─────────────────────────────────────
    const statusBuckets = new Map<string, { count: number; budget: number }>();
    for (const p of projects) {
      const bucket = statusBuckets.get(p.status) ?? { count: 0, budget: 0 };
      bucket.count += 1;
      bucket.budget += p.budget_amount || 0;
      statusBuckets.set(p.status, bucket);
    }
    const portfolioMix = [...statusBuckets.entries()]
      .map(([status, b]) => ({
        status,
        label: humanise(status),
        count: b.count,
        budget: b.budget,
      }))
      .sort((a, b) => b.budget - a.budget);

    // ── Budget vs actual by cost type ───────────────────────────────────────
    const costBuckets = new Map<string, { planned: number; actual: number }>();
    for (const b of budgets) {
      const key = b.cost_type || "Unclassified";
      const bucket = costBuckets.get(key) ?? { planned: 0, actual: 0 };
      bucket.planned += b.planned_amount || 0;
      bucket.actual += b.actual_amount || 0;
      costBuckets.set(key, bucket);
    }
    const budgetByCostType = [...costBuckets.entries()]
      .map(([costType, b]) => ({
        costType: humanise(costType),
        planned: b.planned,
        actual: b.actual,
        variance: b.planned - b.actual,
      }))
      .sort((a, b) => b.planned - a.planned)
      .slice(0, 8);

    // ── Risk exposure by category ───────────────────────────────────────────
    const riskBuckets = new Map<
      string,
      { count: number; score: number; high: number }
    >();
    for (const r of riskData.risks) {
      const bucket = riskBuckets.get(r.category) ?? { count: 0, score: 0, high: 0 };
      bucket.count += 1;
      bucket.score += r.riskScore || 0;
      if (r.riskLevel === "high") bucket.high += 1;
      riskBuckets.set(r.category, bucket);
    }
    const riskExposure = [...riskBuckets.entries()]
      .map(([category, b]) => ({
        category: humanise(category),
        count: b.count,
        totalScore: b.score,
        high: b.high,
      }))
      .sort((a, b) => b.totalScore - a.totalScore || b.count - a.count);

    // ── Resource load by type ───────────────────────────────────────────────
    const resourceLoad = resources.byType.map((t) => ({
      type: humanise(t.type),
      assigned: t.assigned,
      total: t.total,
      allocationPct: Number(t.allocationPct.toFixed(1)),
    }));

    // ── Schedule variance: reported progress against where the plan says ────
    // Only projects still in flight with a planned end date can be measured.
    const scheduleVariance = projects
      .map((p) => {
        const planned = plannedProgressPct(p, now);
        if (planned === null) return null;
        const actual = p.progress_percentage || 0;
        return {
          projectId: p.project_id,
          code: p.project_code,
          name: p.name,
          status: p.status,
          plannedPct: Number(planned.toFixed(1)),
          actualPct: Number(actual.toFixed(1)),
          variancePct: Number((actual - planned).toFixed(1)),
          budget: p.budget_amount || 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // Worst slippage first — that is what a PMO reads this chart for.
      .sort((a, b) => a.variancePct - b.variancePct)
      .slice(0, 8);

    const overdueTasks = tasks.filter((t) => isOverdue(t, now));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      deliveryTrend,
      portfolioMix,
      budgetByCostType,
      riskExposure,
      resourceLoad,
      scheduleVariance,
      totals: {
        tasks: tasks.length,
        overdueTasks: overdueTasks.length,
        projects: projects.length,
        openRisks: riskData.counts.total,
      },
    });
  } catch (error) {
    console.error("analytics/dashboard/charts failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard charts" },
      { status: 500 },
    );
  }
}
