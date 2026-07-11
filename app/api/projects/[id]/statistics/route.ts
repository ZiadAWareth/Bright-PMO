import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/statistics:
 *   get:
 *     summary: Get project statistics
 *     description: Retrieves overall project statistics including total budget and progress
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve statistics for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall_progress:
 *                   type: number
 *                   format: float
 *                   description: Overall project progress percentage (from root WBS)
 *                 total_budget:
 *                   type: number
 *                   format: float
 *                   description: Total budget amount from all WBS items
 *                 total_spent:
 *                   type: number
 *                   format: float
 *                   description: Total actual cost from all WBS items
 *                 budget_utilization:
 *                   type: number
 *                   format: float
 *                   description: Percentage of budget spent
 *                 wbs_count:
 *                   type: integer
 *                   description: Total number of WBS items
 *       404:
 *         description: Project not found
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

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get all WBS items for the project
    const wbsItems = await prisma.wBS.findMany({
      where: { project_id: projectId },
      include: {
        budgets: true
      }
    });

    // Find root WBS (level 0) for overall progress
    const rootWBS = wbsItems.find((wbs: any) => wbs.level === 0);
    const overallProgress = rootWBS?.progress_percentage || 0;

    // Calculate total budget and spent amounts
    let totalBudget = 0;
    let totalSpent = 0;

    wbsItems.forEach((wbs: any) => {
      wbs.budgets.forEach((budget: any) => {
        totalBudget += budget.planned_amount;
        totalSpent += budget.actual_amount;
      });
    });

    // Calculate budget utilization percentage
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const statistics = {
      overall_progress: overallProgress,
      total_budget: totalBudget,
      total_spent: totalSpent,
      budget_utilization: Math.round(budgetUtilization * 100) / 100, // Round to 2 decimal places
      wbs_count: wbsItems.length
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Error fetching project statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch project statistics" },
      { status: 500 }
    );
  }
} 