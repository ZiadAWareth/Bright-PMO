import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/evms:
 *   get:
 *     summary: Get all EVMS data for a project
 *     description: Retrieves a list of all Earned Value Management System (EVMS) data associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve EVMS data for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project EVMS data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   evm_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   task_id:
 *                     type: integer
 *                   reporting_period:
 *                     type: string
 *                     format: date
 *                   planned_value:
 *                     type: number
 *                     format: float
 *                   earned_value:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   schedule_variance:
 *                     type: number
 *                     format: float
 *                   cost_variance:
 *                     type: number
 *                     format: float
 *                   schedule_performance_index:
 *                     type: number
 *                     format: float
 *                   cost_performance_index:
 *                     type: number
 *                     format: float
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No EVMS data found for this project
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
    const projectId = parseInt(id);

    const evms = await prisma.eVM.findMany({
      where: { project_id: projectId },
    });

    return NextResponse.json(evms);
  } catch (error) {
    console.error("Error fetching evms:", error);
    return NextResponse.json(
      { error: "Failed to fetch evms" },
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
    const projectId = parseInt(id);

    const body = await request.json();
    const { fiscal_period, planned_value, earned_value, actual_cost, cost_performance_index, schedule_performance_index, estimate_at_completion, estimate_to_complete, variance_at_completion, reporting_date } = body;

    const evm = await prisma.eVM.create({
      data: {
        fiscal_period,
        planned_value,
        earned_value,
        actual_cost,
        cost_performance_index,
        schedule_performance_index,
        estimate_at_completion,
        estimate_to_complete,
        variance_at_completion,
        reporting_date,
        project_id: projectId,
      },
    });

    return NextResponse.json(evm);
  } catch (error) {
    console.error("Error creating evm:", error);
    return NextResponse.json(
      { error: "Failed to create evm" },
      { status: 500 }
    );
  }
}

