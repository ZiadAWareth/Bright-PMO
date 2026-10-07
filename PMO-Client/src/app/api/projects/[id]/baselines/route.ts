import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/baselines:
 *   get:
 *     summary: Get all baselines for a project
 *     description: Retrieves a list of all baselines associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve baselines for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project baselines retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   baseline_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                   budget:
 *                     type: number
 *                     format: float
 *                   description:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No baselines found for this project
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

    const baselines = await prisma.baseline.findMany({
      where: { project_id: parseInt(id) },
    });

    return NextResponse.json(baselines);
  } catch (error) {
    console.error("Error fetching baselines:", error);
    return NextResponse.json(
      { error: "Failed to fetch baselines" },
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
    const { name, description, baseline_date, baseline_type, scope_snapshot, schedule_snapshot, cost_snapshot, created_by } = body;

    const baseline = await prisma.baseline.create({
      data: {
        name,
        description,
        project_id: parseInt(id),
        baseline_date,
        baseline_type,
        scope_snapshot,
        schedule_snapshot,
        cost_snapshot,
        created_by,
      },
    });

    return NextResponse.json(baseline);
  } catch (error) {
    console.error("Error creating baseline:", error);
    return NextResponse.json(
      { error: "Failed to create baseline" },
      { status: 500 }
    );
  }
}

