import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/risks/{risks_id}:
 *   get:
 *     summary: Get a risk by ID
 *     description: Retrieves a specific risk by its ID
 *     tags:
 *       - Risks
 *     parameters:
 *       - in: path
 *         name: risks_id
 *         required: true
 *         description: ID of the risk to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Risk retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 risk_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 identified_date:
 *                   type: string
 *                   format: date-time
 *                 impact:
 *                   type: string
 *                 probability:
 *                   type: string
 *                 status:
 *                   type: string
 *                 owner_id:
 *                   type: integer
 *                 approvalStatus:
 *                   type: string
 *                 currentStatus:
 *                   type: string
 *       404:
 *         description: Risk not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ risks_id: string }> }
) {
  const resolvedParams = await context.params;
  const { risks_id } = resolvedParams;
  try {
    const id = Number(risks_id);
    console.log("RISKID", id);
    const risk = await prisma.risk.findUnique({ where: { risk_id: id }, include: { mitigations: true } });
    if (!risk) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }
    return NextResponse.json(risk);
  } catch (error) {
    console.error('GET risk error:', error);
    return NextResponse.json({ error: "Failed to fetch risk" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/risks/{risks_id}:
 *   put:
 *     summary: Update a risk
 *     description: Updates an existing risk by ID
 *     tags:
 *       - Risks
 *     parameters:
 *       - in: path
 *         name: risks_id
 *         required: true
 *         description: ID of the risk to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this risk belongs to
 *               name:
 *                 type: string
 *                 description: Name of the risk
 *               description:
 *                 type: string
 *                 description: Detailed description of the risk
 *               identified_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when the risk was identified
 *               impact:
 *                 type: string
 *                 description: Impact level of the risk (e.g., High, Medium, Low)
 *               probability:
 *                 type: string
 *                 description: Probability of the risk occurring
 *               status:
 *                 type: string
 *                 description: Current status of the risk
 *               owner_id:
 *                 type: integer
 *                 description: ID of the user who owns this risk
 *     responses:
 *       200:
 *         description: Risk updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 risk_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 impact:
 *                   type: string
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ risks_id: string }> }
) {
  const resolvedParams = await context.params;
  const { risks_id } = resolvedParams;
  try {
    const id = Number(risks_id);
    const data = await req.json();
    const updatedRisk = await prisma.risk.update({
      where: { risk_id: id },
      data: {
        project_id: data.project_id,
        name: data.name,
        description: data.description,
        identified_date: new Date(data.identified_date),
        impact: data.impact,
        probability: data.probability,
        status: data.status,
        owner_id: data.owner_id,
        updated_at: new Date(),
      },
    });
    return NextResponse.json(updatedRisk);
  } catch (error) {
    console.error("PUT risk error:", error);
    return NextResponse.json({ error: "Failed to update risk" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/risks/{risks_id}:
 *   delete:
 *     summary: Delete a risk
 *     description: Deletes a risk by ID
 *     tags:
 *       - Risks
 *     parameters:
 *       - in: path
 *         name: risks_id
 *         required: true
 *         description: ID of the risk to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Risk deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Risk deleted successfully
 *                 deleted:
 *                   type: object
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ risks_id: string }> }
) {
  const resolvedParams = await context.params;
  const { risks_id } = resolvedParams;
  try {
    const id = Number(risks_id);
    // Delete associated mitigations first to avoid foreign key constraints
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.riskMitigation.deleteMany({ where: { risk_id: id } });
      return tx.risk.delete({ where: { risk_id: id } });
    });
    return NextResponse.json({ message: "Risk deleted successfully", deleted });
  } catch (error) {
    console.error("DELETE risk error:", error);
    return NextResponse.json({ error: "Failed to delete risk" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/risks/{risks_id}:
 *   patch:
 *     summary: Update risk approval status
 *     description: Updates the approval status of a risk and creates mitigation plan when approved
 *     tags:
 *       - Risks
 *     parameters:
 *       - in: path
 *         name: risks_id
 *         required: true
 *         description: ID of the risk to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalStatus:
 *                 type: string
 *                 description: New approval status (e.g., "Approved for Mitigation")
 *     responses:
 *       200:
 *         description: Risk status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Risk approved and mitigation plan created.
 *       500:
 *         description: Server error
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ risks_id: string }> }
) {
  const resolvedParams = await context.params;
  const { risks_id } = resolvedParams;
  try {
    const id = Number(risks_id);
    const data = await req.json();
    const updatedRisk = await prisma.risk.update({
      where: { risk_id: id },
      data,
    });
    return NextResponse.json(updatedRisk);
  } catch (error) {
    console.error("PATCH risk error:", error);
    return NextResponse.json({ error: "Failed to patch risk" }, { status: 500 });
  }
}
