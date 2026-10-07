import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/budgets:
 *   get:
 *     summary: Get all budgets for a project
 *     description: Retrieves a list of all budgets associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve budgets for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project budgets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   budget_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   cost_type:
 *                     type: string
 *                   planned_amount:
 *                     type: number
 *                     format: float
 *                   actual_amount:
 *                     type: number
 *                     format: float
 *                   variance:
 *                     type: number
 *                     format: float
 *                   fiscal_year:
 *                     type: integer
 *                   fiscal_period:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No budgets found for this project
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

    const budgets = await prisma.budget.findMany({
      where: { project_id: parseInt(id) },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { wbs_id, task_id, cost_type, planned_amount, actual_amount, variance, threshold, fiscal_year, fiscal_period } = body;

    // If this is a WBS or Task budget creation, validate against parent WBS total
    if ((wbs_id ) && planned_amount !== undefined) {
      let wbsItem = null;
      if (wbs_id) {
        wbsItem = await prisma.wBS.findUnique({ where: { wbs_id: Number(wbs_id) } });
      } 
      // else if (task_id) {
      //   const task = await prisma.task.findUnique({
      //     where: { task_id: Number(task_id) },
      //     include: { wbs: true }
      //   });
      //   if (task) wbsItem = task.wbs;
      // }

      if (wbsItem && wbsItem.parent_wbs_id) {
        const parentWbs = await prisma.wBS.findUnique({
          where: { wbs_id: wbsItem.parent_wbs_id },
          include: { 
            budgets: true,
            children: { include: { budgets: true, tasks: { include: { budgets: true } } } }
          },
        });

        if (parentWbs) {
          const parentPlannedTotal = parentWbs.budgets.reduce((sum, b) => sum + b.planned_amount, 0);

          // Calculate the current total planned amount for all children
          let currentChildrenTotal = 0;
          for (const childWbs of parentWbs.children) {
            currentChildrenTotal += childWbs.budgets.reduce((s, b) => s + b.planned_amount, 0);
            for (const task of childWbs.tasks) {
              currentChildrenTotal += task.budgets.reduce((s, b) => s + b.planned_amount, 0);
            }
          }

          // Add the new amount to the total
          const newChildrenTotal = currentChildrenTotal + planned_amount;

          if (newChildrenTotal > parentPlannedTotal) {
            return NextResponse.json(
              {
                error: 'Budget validation failed',
                details: `The new total planned budget for all children (${newChildrenTotal.toLocaleString()}) would exceed the parent WBS budget.`,
                parentWbsName: parentWbs.name,
              },
              { status: 400 }
            );
          }
        }
      }
    }
    else if (task_id && planned_amount !== undefined) {
      const task = await prisma.task.findUnique({
        where: { task_id: Number(task_id) },
        include: { wbs: true }
      });
      if (task && task.wbs) {
        const parentWbs = await prisma.wBS.findUnique({
          where: { wbs_id: task.wbs_id },
          include: {
            budgets: true,
            children: { include: { budgets: true, tasks: { include: { budgets: true } } } },
            tasks: { include: { budgets: true } },
          },
        });
        if (parentWbs) {
          const parentPlannedTotal = parentWbs.budgets.reduce((sum, b) => sum + b.planned_amount, 0);
          // Calculate the current total planned amount for all children
          let currentChildrenTotal = 0;
          for (const childWbs of parentWbs.children) {
            currentChildrenTotal += childWbs.budgets.reduce((s, b) => s + b.planned_amount, 0);
            for (const task of parentWbs.tasks) {
              if(task.task_id !== task_id) // Exclude the current task
                currentChildrenTotal += task.budgets.reduce((s, b) => s + b.planned_amount, 0);
            }
          }

          // Add the new amount to the total
          const newChildrenTotal = currentChildrenTotal + planned_amount;
          if (newChildrenTotal > parentPlannedTotal) {
            return NextResponse.json(
              {
                error: 'Budget validation failed',
                details: `The new total planned budget for all children (OMR ${newChildrenTotal.toLocaleString()}) would exceed the parent WBS budget (OMR ${parentPlannedTotal.toLocaleString()}). The parent WBS "${parentWbs.name}" has a budget limit of OMR ${parentPlannedTotal.toLocaleString()}.`,
                parentWbsName: parentWbs.name,
                parentWbsBudget: parentPlannedTotal,
                childrenTotal: newChildrenTotal,
              },
              { status: 400 }
            );
          }
        }
      }
    }
    
    const budget = await prisma.budget.create({
      data: {
        wbs_id: wbs_id ? Number(wbs_id) : null,
        task_id: task_id ? Number(task_id) : null,
        cost_type,
        planned_amount,
        actual_amount,
        variance,
        threshold,
        fiscal_year: fiscal_year ? Number(fiscal_year) : 1,
        fiscal_period: fiscal_period || "1",
        project_id: parseInt(id),
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

