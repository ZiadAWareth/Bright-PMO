import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    include: {
      wbs: {
        include: {
          wbsItems: true,
          tasks: true,
        },
      },
      budgets: true,
      procurements: true,
    },
  }) as any;

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Find the top-level project budget (no wbs_id, no task_id)
  const topLevelBudget = project.budgets.find((b: any) => b.wbs_id == null && b.task_id == null);
  const budget_amount = topLevelBudget ? topLevelBudget.planned_amount : project.budget_amount;
  const actual_cost = topLevelBudget ? topLevelBudget.actual_amount : project.actual_cost;

  // Project-level metrics
  const planned_duration_days = Math.round((project.planned_end_date.getTime() - project.start_date.getTime()) / (1000 * 60 * 60 * 24));
  const actual_duration_days = project.actual_end_date ? Math.round((project.actual_end_date.getTime() - project.start_date.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const cost_overrun = actual_cost - budget_amount;
  const cost_overrun_percent = budget_amount > 0 ? (cost_overrun / budget_amount) * 100 : null;
  const project_roi = project.roi;
  const planned_cost_per_m2 = project.size ? budget_amount / project.size : null;
  const actual_cost_per_m2 = project.size ? actual_cost / project.size : null;

  // Gather all tasks from all WBS
  const allTasks = project.wbs.flatMap((wbs: any) => wbs.tasks);

  // Schedule/Tasks metrics
  let totalDelay = 0, delayCount = 0, criticalPathDelays = 0, totalCompletion = 0;
  for (const task of allTasks) {
    if (task.actual_end_date && task.end_date) {
      const delay = (task.actual_end_date.getTime() - task.end_date.getTime()) / (1000 * 60 * 60 * 24);
      totalDelay += delay;
      delayCount++;
      if (task.is_critical_path && task.actual_end_date > task.end_date) {
        criticalPathDelays++;
      }
    }
    totalCompletion += task.progress_percentage || 0;
  }
  const average_task_delay_days = delayCount > 0 ? totalDelay / delayCount : null;
  const average_task_completion_rate = allTasks.length > 0 ? totalCompletion / allTasks.length : null;

  // Resource Efficiency
  let total_estimated_hours = 0, total_actual_hours = 0;
  for (const task of allTasks) {
    total_estimated_hours += task.estimated_hours || 0;
    total_actual_hours += task.actual_hours || 0;
  }
  const efficiency_ratio = total_estimated_hours > 0 ? total_actual_hours / total_estimated_hours : null;

  // Budget Variance (only top-level budgets)
  let total_budget_variance = 0, total_budget_threshold_violations = 0;
  for (const budget of project.budgets) {
    if (budget.wbs_id == null && budget.task_id == null) {
      total_budget_variance += (budget.actual_amount - budget.planned_amount);
      if (budget.actual_amount > budget.planned_amount + budget.threshold) {
        total_budget_threshold_violations++;
      }
    }
  }

  // Derived Performance Indicators
  const earned_value = (project.progress_percentage * budget_amount) / 100;
  const now = new Date();
  const plannedValueDenom = project.planned_end_date.getTime() - project.start_date.getTime();
  const planned_value = plannedValueDenom > 0 ? ((now.getTime() - project.start_date.getTime()) / plannedValueDenom) * budget_amount : null;
  const cpi = actual_cost > 0 ? earned_value / actual_cost : null;
  const spi = planned_value && planned_value > 0 ? earned_value / planned_value : null;
  const estimate_at_completion = cpi && cpi > 0 ? actual_cost + (budget_amount - earned_value) / cpi : null;
  const variance_at_completion = estimate_at_completion ? budget_amount - estimate_at_completion : null;
  const size = project.size

  return NextResponse.json({
    project_id: project.project_id,
    planned_duration_days,
    actual_duration_days,
    cost_overrun,
    cost_overrun_percent,
    project_roi,
    planned_cost_per_m2,
    actual_cost_per_m2,
    average_task_delay_days,
    critical_path_delays: criticalPathDelays,
    average_task_completion_rate,
    total_estimated_hours,
    total_actual_hours,
    efficiency_ratio,
    total_budget_variance,
    total_budget_threshold_violations,
    earned_value,
    planned_value,
    cpi,
    spi,
    estimate_at_completion,
    variance_at_completion,
    size,
  });
}
