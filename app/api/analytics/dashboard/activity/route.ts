import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { humanise } from "@/lib/services/portfolio-analytics";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

type FeedEntry = {
  id: string;
  kind: "activity" | "project" | "task" | "risk" | "approval";
  title: string;
  detail: string;
  href: string | null;
  at: string;
};

/**
 * @swagger
 * /api/analytics/dashboard/activity:
 *   get:
 *     summary: Recent delivery activity feed
 *     description: >
 *       Merges the audited RecentActivity log with the latest project, task,
 *       risk and approval changes. The log is authoritative where it has rows;
 *       the record timestamps fill the gap on installs where activity logging
 *       was switched on later, so the panel is never blank while work is
 *       demonstrably happening.
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Activity feed
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT),
    );

    const [logged, projects, tasks, risks, approvals] = await Promise.all([
      prisma.recentActivity.findMany({
        orderBy: { created_at: "desc" },
        take: limit,
        select: {
          activity_id: true,
          action: true,
          entity_type: true,
          entity_id: true,
          title: true,
          description: true,
          created_at: true,
          user: { select: { email: true } },
        },
      }),
      prisma.project.findMany({
        where: { archived: false },
        orderBy: { updated_at: "desc" },
        take: limit,
        select: {
          project_id: true,
          name: true,
          status: true,
          progress_percentage: true,
          updated_at: true,
        },
      }),
      prisma.task.findMany({
        where: { wbs: { project: { archived: false } } },
        orderBy: { updated_at: "desc" },
        take: limit,
        select: {
          task_id: true,
          name: true,
          status: true,
          progress_percentage: true,
          updated_at: true,
          wbs: { select: { project_id: true, project: { select: { name: true } } } },
        },
      }),
      prisma.risk.findMany({
        where: { project: { archived: false } },
        orderBy: { updated_at: "desc" },
        take: limit,
        select: {
          risk_id: true,
          name: true,
          status: true,
          riskLevel: true,
          updated_at: true,
          project: { select: { project_id: true, name: true } },
        },
      }),
      prisma.projectApproval.findMany({
        where: { project: { archived: false } },
        orderBy: { id: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          type: true,
          step: true,
          reviewed_at: true,
          project: { select: { project_id: true, name: true } },
        },
      }),
    ]);

    const entries: FeedEntry[] = [
      ...logged.map((a) => ({
        id: `activity-${a.activity_id}`,
        kind: "activity" as const,
        title: a.title,
        detail:
          a.description ??
          `${humanise(a.action)} on ${a.entity_type}${a.user?.email ? ` · ${a.user.email}` : ""}`,
        href: hrefForEntity(a.entity_type, a.entity_id),
        at: a.created_at.toISOString(),
      })),
      ...projects.map((p) => ({
        id: `project-${p.project_id}`,
        kind: "project" as const,
        title: p.name,
        detail: `Project ${humanise(p.status)} · ${Math.round(p.progress_percentage || 0)}% complete`,
        href: `/projects/${p.project_id}`,
        at: p.updated_at.toISOString(),
      })),
      ...tasks.map((t) => ({
        id: `task-${t.task_id}`,
        kind: "task" as const,
        title: t.name,
        detail: `Task ${humanise(t.status)} · ${t.wbs.project.name}`,
        href: `/projects/${t.wbs.project_id}/tasks/${t.task_id}`,
        at: t.updated_at.toISOString(),
      })),
      ...risks.map((r) => ({
        id: `risk-${r.risk_id}`,
        kind: "risk" as const,
        title: r.name,
        detail: `${humanise(r.riskLevel)} risk ${humanise(r.status)} · ${r.project.name}`,
        href: `/risk/${r.risk_id}`,
        at: r.updated_at.toISOString(),
      })),
      ...approvals
        // Only surface gates that have actually been acted on; an untouched
        // PENDING row has no event time to sort by.
        .filter((a) => a.reviewed_at !== null)
        .map((a) => ({
          id: `approval-${a.id}`,
          kind: "approval" as const,
          title: `${humanise(a.type)} ${humanise(a.status)}`,
          detail: `Step ${a.step} · ${a.project.name}`,
          href: `/projects/${a.project.project_id}/approval`,
          at: a.reviewed_at!.toISOString(),
        })),
    ];

    entries.sort((a, b) => b.at.localeCompare(a.at));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      // Tells the UI whether the audited log is populated on this install.
      loggedActivityCount: logged.length,
      entries: entries.slice(0, limit),
    });
  } catch (error) {
    console.error("analytics/dashboard/activity failed:", error);
    return NextResponse.json(
      { error: "Failed to load recent activity" },
      { status: 500 },
    );
  }
}

function hrefForEntity(entityType: string, entityId: number | null): string | null {
  if (entityId === null) return null;
  switch (entityType.toLowerCase()) {
    case "project":
      return `/projects/${entityId}`;
    case "risk":
      return `/risk/${entityId}`;
    case "portfolio":
      return `/portfolios/${entityId}`;
    case "resource":
      return `/resources/${entityId}`;
    default:
      return null;
  }
}
