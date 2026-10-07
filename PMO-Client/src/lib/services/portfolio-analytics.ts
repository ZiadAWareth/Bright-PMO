/**
 * Portfolio analytics — the aggregations behind the Analytics dashboard.
 *
 * Everything here is derived from the PMO tables (projects, WBS, tasks, budgets,
 * risks, resources, approvals). Nothing is sampled or synthesised: where a
 * figure cannot be computed from the data on hand the function returns null or
 * an empty series so the UI can say "no data" rather than show a made-up number.
 *
 * Earned-value figures prefer the `EVM` table when a project has reporting rows,
 * because that is the system of record. Only when a project has never been
 * measured do we fall back to deriving EV from budget × progress, and the API
 * reports which basis was used.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma, ProjectStatus, TaskStatus } from "@prisma/client";

/** Statuses that mean a project is still being delivered. */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "execution",
  "approved",
];

/** Statuses that take a project out of the delivery pipeline. */
export const CLOSED_PROJECT_STATUSES: ProjectStatus[] = ["completed", "closed"];

/** Risk statuses that still represent live exposure. */
const OPEN_RISK_STATUSES = [
  "identified",
  "assessed",
  "monitoring",
  "escalated",
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProjectRow {
  project_id: number;
  project_code: string;
  name: string;
  status: ProjectStatus;
  budget_amount: number;
  actual_cost: number;
  allocated_cost: number;
  progress_percentage: number;
  healthScore: number;
  riskScore: number;
  start_date: Date;
  planned_end_date: Date | null;
  actual_end_date: Date | null;
  portfolio_id: number;
  type: string;
  priority: string;
}

/** Non-archived projects — the population every figure on the dashboard uses. */
export async function loadProjects(): Promise<ProjectRow[]> {
  return prisma.project.findMany({
    where: { archived: false },
    select: {
      project_id: true,
      project_code: true,
      name: true,
      status: true,
      budget_amount: true,
      actual_cost: true,
      allocated_cost: true,
      progress_percentage: true,
      healthScore: true,
      riskScore: true,
      start_date: true,
      planned_end_date: true,
      actual_end_date: true,
      portfolio_id: true,
      type: true,
      priority: true,
    },
    orderBy: { project_id: "asc" },
  }) as unknown as Promise<ProjectRow[]>;
}

/**
 * Where a project *should* be today, as a percentage, from its own schedule.
 * Returns null when the project has no planned end date (nothing to measure
 * against) or has not started yet.
 */
export function plannedProgressPct(
  project: Pick<ProjectRow, "start_date" | "planned_end_date" | "status">,
  now: Date,
): number | null {
  if (!project.planned_end_date) return null;
  const start = project.start_date.getTime();
  const end = project.planned_end_date.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  const elapsed = now.getTime() - start;
  if (elapsed <= 0) return 0;
  return Math.min(100, (elapsed / (end - start)) * 100);
}

export interface EarnedValueSummary {
  /** Budget at completion — approved budget across the population. */
  bac: number;
  /** Planned value — what should have been earned by today. */
  pv: number;
  /** Earned value — budget × progress achieved. */
  ev: number;
  /** Actual cost booked. */
  ac: number;
  /** EV / PV. Null when PV is zero (nothing scheduled yet). */
  spi: number | null;
  /** EV / AC. Null when nothing has been spent. */
  cpi: number | null;
  /** How many projects contributed measured EVM rows rather than derived ones. */
  measuredProjects: number;
  derivedProjects: number;
}

/**
 * Roll earned-value up across a set of projects.
 *
 * `evmByProject` holds the latest EVM reporting row per project when one exists;
 * those values win. Projects without one are derived from budget × progress,
 * which is the same basis the project health calculator already uses.
 */
export function summariseEarnedValue(
  projects: ProjectRow[],
  evmByProject: Map<number, { planned_value: number; earned_value: number; actual_cost: number }>,
  now: Date,
): EarnedValueSummary {
  let bac = 0;
  let pv = 0;
  let ev = 0;
  let ac = 0;
  let measuredProjects = 0;
  let derivedProjects = 0;

  for (const project of projects) {
    const budget = project.budget_amount || 0;
    bac += budget;

    const measured = evmByProject.get(project.project_id);
    if (measured) {
      pv += measured.planned_value || 0;
      ev += measured.earned_value || 0;
      ac += measured.actual_cost || 0;
      measuredProjects += 1;
      continue;
    }

    derivedProjects += 1;
    ev += budget * ((project.progress_percentage || 0) / 100);
    ac += project.actual_cost || 0;

    const plannedPct = plannedProgressPct(project, now);
    // No planned end date means no schedule to measure against, so the project
    // contributes cost but not schedule performance.
    if (plannedPct !== null) {
      pv += budget * (plannedPct / 100);
    }
  }

  return {
    bac,
    pv,
    ev,
    ac,
    spi: pv > 0 ? ev / pv : null,
    cpi: ac > 0 ? ev / ac : null,
    measuredProjects,
    derivedProjects,
  };
}

/** Latest EVM reporting row per project, keyed by project id. */
export async function loadLatestEvm() {
  const rows = await prisma.eVM.findMany({
    orderBy: { reporting_date: "desc" },
    select: {
      project_id: true,
      planned_value: true,
      earned_value: true,
      actual_cost: true,
      reporting_date: true,
    },
  });

  const byProject = new Map<
    number,
    { planned_value: number; earned_value: number; actual_cost: number }
  >();
  for (const row of rows) {
    // Ordered newest-first, so the first row seen per project is the latest.
    if (!byProject.has(row.project_id)) {
      byProject.set(row.project_id, {
        planned_value: row.planned_value,
        earned_value: row.earned_value,
        actual_cost: row.actual_cost,
      });
    }
  }
  return byProject;
}

export interface TaskRow {
  task_id: number;
  name: string;
  status: TaskStatus;
  start_date: Date;
  end_date: Date;
  actual_end_date: Date | null;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  estimated_hours: number;
  actual_hours: number;
  created_at: Date;
  project_id: number;
  project_name: string;
}

/** Every task on a non-archived project, flattened with its owning project. */
export async function loadTasks(): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: { wbs: { project: { archived: false } } },
    select: {
      task_id: true,
      name: true,
      status: true,
      start_date: true,
      end_date: true,
      actual_end_date: true,
      progress_percentage: true,
      is_milestone: true,
      is_critical_path: true,
      estimated_hours: true,
      actual_hours: true,
      created_at: true,
      wbs: { select: { project_id: true, project: { select: { name: true } } } },
    },
  });

  return tasks.map((t) => ({
    task_id: t.task_id,
    name: t.name,
    status: t.status,
    start_date: t.start_date,
    end_date: t.end_date,
    actual_end_date: t.actual_end_date,
    progress_percentage: t.progress_percentage,
    is_milestone: t.is_milestone,
    is_critical_path: t.is_critical_path,
    estimated_hours: t.estimated_hours,
    actual_hours: t.actual_hours,
    created_at: t.created_at,
    project_id: t.wbs.project_id,
    project_name: t.wbs.project.name,
  }));
}

/** A task is late when its due date has passed and it is not finished. */
export function isOverdue(task: Pick<TaskRow, "end_date" | "status">, now: Date) {
  return task.status !== "completed" && task.end_date.getTime() < now.getTime();
}

/** Tasks due within the next `days` days that are not yet complete. */
export function isDueSoon(
  task: Pick<TaskRow, "end_date" | "status">,
  now: Date,
  days: number,
) {
  if (task.status === "completed") return false;
  const delta = task.end_date.getTime() - now.getTime();
  return delta >= 0 && delta <= days * MS_PER_DAY;
}

export interface OpenRiskCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
  escalated: number;
  overdueReview: number;
}

/** Open risk exposure across non-archived projects. */
export async function loadOpenRisks(now: Date) {
  const risks = await prisma.risk.findMany({
    where: {
      project: { archived: false },
      status: { in: [...OPEN_RISK_STATUSES] },
    },
    select: {
      risk_id: true,
      name: true,
      category: true,
      riskLevel: true,
      riskScore: true,
      status: true,
      next_review: true,
      identified_date: true,
      project: { select: { project_id: true, name: true } },
    },
  });

  const counts: OpenRiskCounts = {
    total: risks.length,
    high: 0,
    medium: 0,
    low: 0,
    escalated: 0,
    overdueReview: 0,
  };

  for (const risk of risks) {
    if (risk.riskLevel === "high") counts.high += 1;
    else if (risk.riskLevel === "medium") counts.medium += 1;
    else counts.low += 1;

    if (risk.status === "escalated") counts.escalated += 1;
    if (risk.next_review && risk.next_review.getTime() < now.getTime()) {
      counts.overdueReview += 1;
    }
  }

  return { risks, counts };
}

/**
 * Approvals still waiting on someone. Counts both the generic `Approval`
 * queue and the per-project `ProjectApproval` gate steps, since a reviewer sees
 * work from both.
 */
export async function countPendingApprovals() {
  const pendingStatuses: Prisma.EnumApprovalStatusFilter = {
    in: ["PENDING", "WAITING", "REVISION_REQUESTED"],
  };

  const [generic, gates] = await Promise.all([
    prisma.approval.count({ where: { status: pendingStatuses } }),
    prisma.projectApproval.count({
      where: { status: pendingStatuses, project: { archived: false } },
    }),
  ]);

  return { generic, gates, total: generic + gates };
}

export interface ResourceUtilisation {
  /** Weighted allocation across resources with an active assignment today. */
  allocatedPct: number | null;
  assignedResources: number;
  totalResources: number;
  byType: { type: string; assigned: number; total: number; allocationPct: number }[];
}

/**
 * Resource load, measured from assignments overlapping today.
 *
 * `allocation_percentage` is per assignment, so a resource on two 50%
 * assignments reads as 100% loaded. Anything above 100% is over-allocation and
 * is deliberately not clamped — that is the signal worth seeing.
 */
export async function loadResourceUtilisation(now: Date): Promise<ResourceUtilisation> {
  const [resources, assignments] = await Promise.all([
    prisma.resource.findMany({
      select: { resource_id: true, type: true, availability_status: true },
    }),
    prisma.resourceAssignment.findMany({
      where: { start_date: { lte: now }, end_date: { gte: now } },
      select: { resource_id: true, allocation_percentage: true },
    }),
  ]);

  const loadByResource = new Map<number, number>();
  for (const a of assignments) {
    loadByResource.set(
      a.resource_id,
      (loadByResource.get(a.resource_id) ?? 0) + (a.allocation_percentage || 0),
    );
  }

  const typeBuckets = new Map<string, { assigned: number; total: number; load: number }>();
  for (const r of resources) {
    const bucket = typeBuckets.get(r.type) ?? { assigned: 0, total: 0, load: 0 };
    bucket.total += 1;
    const load = loadByResource.get(r.resource_id) ?? 0;
    if (load > 0) {
      bucket.assigned += 1;
      bucket.load += load;
    }
    typeBuckets.set(r.type, bucket);
  }

  const totalResources = resources.length;
  const assignedResources = loadByResource.size;
  const totalLoad = [...loadByResource.values()].reduce((s, v) => s + v, 0);

  return {
    // Averaged over the whole pool, not just the busy ones — an idle bench is
    // part of utilisation.
    allocatedPct: totalResources > 0 ? totalLoad / totalResources : null,
    assignedResources,
    totalResources,
    byType: [...typeBuckets.entries()]
      .map(([type, b]) => ({
        type,
        assigned: b.assigned,
        total: b.total,
        allocationPct: b.total > 0 ? b.load / b.total : 0,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

// ── formatting helpers shared by the routes ────────────────────────────────

/** Compact money for KPI tiles: 22,000,000 → "22.0M". */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

/** UTC month key so bucketing never shifts with the server's timezone. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last `count` months, oldest first, as `{ key, label }`. */
export function recentMonths(count: number, now: Date) {
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      key: monthKey(d),
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    });
  }
  return months;
}

/** Turns an enum-ish token ("in_progress") into a label ("In progress"). */
export function humanise(token: string): string {
  const spaced = token.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
