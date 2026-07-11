import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/procurements:
 *   get:
 *     summary: Get all procurements for a project
 *     description: Retrieves a list of all procurements associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve procurements for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project procurements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   procurement_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   procurement_type:
 *                     type: string
 *                     enum: [Goods, Services, Works]
 *                   method:
 *                     type: string
 *                     enum: [Open Tender, Restricted Tender, Direct Contract, Framework Agreement]
 *                   estimated_value:
 *                     type: number
 *                     format: float
 *                   actual_value:
 *                     type: number
 *                     format: float
 *                   status:
 *                     type: string
 *                     enum: [Planning, Tendering, Evaluation, Awarded, Completed, Cancelled]
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                   procurement_manager:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No procurements found for this project
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

    const procurements = await prisma.procurement.findMany({
      where: { project_id: projectId },
    });

    if (!procurements) {
      return NextResponse.json({ error: 'No procurements found for this project.' }, { status: 404 });
    }

    return NextResponse.json(procurements, { status: 200 });
  } catch (error) {
    console.error("Error fetching procurements:", error);
    return NextResponse.json(
      { error: "Failed to fetch procurements" },
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
    console.log('Project procurement creation - received data:', body);
    
    const { type, description, estimated_cost, actual_cost, status } = body;

    // Validate required fields
    if (!type || !description || !estimated_cost || !actual_cost || !status) {
      return NextResponse.json(
        { error: "Missing required fields: type, description, estimated_cost, actual_cost, status" },
        { status: 400 }
      );
    }

    // Validate that actual_cost is greater than 0
    if (parseFloat(actual_cost) <= 0) {
      return NextResponse.json(
        { error: "Actual cost must be greater than 0" },
        { status: 400 }
      );
    }

    const procurement = await prisma.procurement.create({
      data: {
        type,
        description,
        estimated_cost: parseFloat(estimated_cost),
        actual_cost: parseFloat(actual_cost),
        status,
        project_id: projectId,
      },
    });

    console.log('Project procurement created successfully:', procurement);
    return NextResponse.json(procurement, { status: 201 });
  } catch (error) {
    console.error("Error creating procurement:", error);
    return NextResponse.json(
      { error: "Failed to create procurement", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

