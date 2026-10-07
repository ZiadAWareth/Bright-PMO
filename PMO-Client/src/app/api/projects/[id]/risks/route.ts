import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/risks:
 *   get:
 *     summary: Get all risks for a project
 *     description: Retrieves a list of all risks associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve risks for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project risks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   risk_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [Technical, Financial, Schedule, Resource, External, Quality, Legal, Environmental]
 *                   identified_date:
 *                     type: string
 *                     format: date
 *                   impact:
 *                     type: string
 *                     enum: [high, medium, low]
 *                   probability:
 *                     type: string
 *                     enum: [high, medium, low]
 *                   riskLevel:
 *                     type: string
 *                     enum: [High, Medium, Low]
 *                   status:
 *                     type: string
 *                     enum: [open, mitigated, closed, monitoring]
 *                   owner_id:
 *                     type: integer
 *                   mitigation_plan:
 *                     type: string
 *                   contingency_plan:
 *                     type: string
 *                   review_date:
 *                     type: string
 *                     format: date
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No risks found for this project
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

    const risks = await prisma.risk.findMany({
      where: { project_id: projectId },
    });

    if (!risks) {
      return NextResponse.json({ error: 'No risks found for this project.' }, { status: 404 });
    }

    return NextResponse.json(risks, { status: 200 });
  } catch (error) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      { error: "Failed to fetch risks" },
      { status: 500 }
    );
  }
}

