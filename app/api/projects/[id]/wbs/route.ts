import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { weightedProgressAverage } from "@/lib/wbs-progress-utils";

// Helper function to recalculate progress for all WBS items that have children (uses optional progress_weight)
async function recalculateAllParentProgress(projectId: number): Promise<void> {
  try {
    const allWBS = await prisma.wBS.findMany({
      where: { project_id: projectId },
      select: { wbs_id: true, parent_wbs_id: true, progress_percentage: true, progress_weight: true },
      orderBy: { level: 'desc' }
    });

    const parentsWithChildren = new Set<number>();
    allWBS.forEach((wbs: { wbs_id: number; parent_wbs_id: number | null }) => {
      if (wbs.parent_wbs_id) parentsWithChildren.add(wbs.parent_wbs_id);
    });

    for (const parentId of parentsWithChildren) {
      const children = allWBS.filter((w: { parent_wbs_id: number | null }) => w.parent_wbs_id === parentId);
      if (children.length === 0) continue;
      const items = children.map((c: { progress_percentage: number; progress_weight?: number | null }) => ({
        progress: c.progress_percentage,
        weight: c.progress_weight ?? null
      }));
      const averageProgress = weightedProgressAverage(items);
      await prisma.wBS.update({
        where: { wbs_id: parentId },
        data: { progress_percentage: averageProgress }
      });
    }

    const rootWBSList = await prisma.wBS.findMany({
      where: { project_id: projectId, parent_wbs_id: null },
      select: { progress_percentage: true, progress_weight: true }
    });
    if (rootWBSList.length > 0) {
      const rootItems = rootWBSList.map((w: { progress_percentage: number; progress_weight?: number | null }) => ({
        progress: w.progress_percentage,
        weight: w.progress_weight ?? null
      }));
      const projectProgress = weightedProgressAverage(rootItems);
      await prisma.project.update({
        where: { project_id: projectId },
        data: { progress_percentage: projectProgress }
      });
    }
  } catch (error) {
    console.error('Error recalculating parent progress:', error);
  }
}

/**
 * @swagger
 * /api/projects/{id}/wbs:
 *   get:
 *     summary: Get all WBS elements for a project
 *     description: Retrieves a list of all Work Breakdown Structure (WBS) elements associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve WBS elements for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project WBS elements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   wbs_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   parent_wbs_id:
 *                     type: integer
 *                   wbs_code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   level:
 *                     type: integer
 *                   sort_order:
 *                     type: integer
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                   budget_amount:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   progress_percentage:
 *                     type: number
 *                     format: float
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No WBS elements found for this project
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const projectId = parseInt(id, 10);

    // Recalculate progress for all parent WBS items before fetching
    await recalculateAllParentProgress(projectId);

    const wbs = await prisma.wBS.findMany({
      where: { project_id: projectId },
      include: {
        wbsItems: true,
        budgets: {
          select: { planned_amount: true, actual_amount: true },
        },
      },
    });

    // Attach aggregated budget per WBS (single response, no N+1)
    const wbsWithBudget = wbs.map((row) => {
      const budget_amount = row.budgets.reduce((s, b) => s + b.planned_amount, 0);
      const actual_cost = row.budgets.reduce((s, b) => s + b.actual_amount, 0);
      const { budgets, ...rest } = row;
      return {
        ...rest,
        budget_amount,
        actual_cost,
        budgets: row.budgets,
      };
    });

    return NextResponse.json(wbsWithBudget);
  } catch (error) {
    console.error("Error fetching wbs:", error);
    return NextResponse.json(
      { error: "Failed to fetch wbs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check user role for WBS modification permissions
    const { role } = await getUserFromHeaders();
    const allowedRoles = ['PJM', 'PMO', 'ADMIN'];
    
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Access denied. Only PJM, PMO, and ADMIN roles can create WBS items." },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { name, description, wbs_code, level, progress_percentage, progress_weight, start_date, end_date } = body;

    const projectId = parseInt(id, 10);

    const createData: Record<string, unknown> = {
      name,
      description,
      wbs_code,
      level,
      progress_percentage: progress_percentage ?? 0,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      project_id: projectId,
    };
    if (progress_weight != null && progress_weight !== '') createData.progress_weight = Number(progress_weight);

    const wbs = await prisma.wBS.create({
      data: createData as any,
      include: {
        wbsItems: true,
      },
    });

    return NextResponse.json(wbs);
  } catch (error) {
    console.error("Error creating wbs:", error);
    return NextResponse.json(
      { error: "Failed to create wbs" },
      { status: 500 }
    );
  }
}

