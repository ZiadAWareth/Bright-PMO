import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/riskMitigations/{mitigation_id}:
 *   get:
 *     summary: Get a risk mitigation by ID
 *     description: Retrieves a specific risk mitigation by its ID
 *     tags:
 *       - Risk Mitigations
 *     parameters:
 *       - in: path
 *         name: mitigation_id
 *         required: true
 *         description: ID of the risk mitigation to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Risk mitigation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mitigation_id:
 *                   type: integer
 *                 risk_id:
 *                   type: integer
 *                 description:
 *                   type: string
 *                 action_plan:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 due_date:
 *                   type: string
 *                   format: date
 *                 status:
 *                   type: string
 *                 responsible_id:
 *                   type: integer
 *                 assigned_to:
 *                   type: integer
 *       404:
 *         description: Mitigation not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ mitigation_id: string }> }) {
  const resolvedParams = await context.params;
  const { mitigation_id } = resolvedParams;
  try {
    const mitigation = await prisma.riskMitigation.findUnique({
      where: { mitigation_id: Number(mitigation_id) },
    });

    if (!mitigation) {
      return NextResponse.json({ error: "Mitigation not found" }, { status: 404 });
    }

    return NextResponse.json(mitigation);
  } catch (error) {
    console.error("GET mitigation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/riskMitigations/{mitigation_id}:
 *   put:
 *     summary: Update a risk mitigation
 *     description: Updates an existing risk mitigation by ID
 *     tags:
 *       - Risk Mitigations
 *     parameters:
 *       - in: path
 *         name: mitigation_id
 *         required: true
 *         description: ID of the risk mitigation to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               risk_id:
 *                 type: integer
 *                 description: ID of the risk this mitigation addresses
 *               description:
 *                 type: string
 *                 description: Description of the mitigation plan
 *               action_plan:
 *                 type: string
 *                 description: Detailed action plan for mitigation
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the mitigation plan
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: Due date for mitigation completion
 *               status:
 *                 type: string
 *                 description: Current status of the mitigation
 *               responsible_id:
 *                 type: integer
 *                 description: ID of the user responsible for this mitigation
 *               assigned_to:
 *                 type: integer
 *                 description: ID of the user assigned to this mitigation
 *     responses:
 *       200:
 *         description: Risk mitigation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mitigation_id:
 *                   type: integer
 *                 risk_id:
 *                   type: integer
 *                 description:
 *                   type: string
 *       400:
 *         description: Update failed
 *       404:
 *         description: Mitigation not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ mitigation_id: string }> }) {
  const resolvedParams = await context.params;
  const { mitigation_id } = resolvedParams;
  try {
    const existingMitigation = await prisma.riskMitigation.findUnique({
      where: { mitigation_id: Number(mitigation_id) }
    });

    if (!existingMitigation) {
      return NextResponse.json({ error: "Mitigation not found" }, { status: 404 });
    }

    const data = await req.json();

    const updatedMitigation = await prisma.riskMitigation.update({
      where: { mitigation_id: Number(mitigation_id) },
      data: {
        risk_id: data.risk_id,
        description: data.description,
      },
    });

    return NextResponse.json(updatedMitigation);
  } catch (error) {
    console.error("PUT mitigation error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/riskMitigations/{mitigation_id}:
 *   delete:
 *     summary: Delete a risk mitigation
 *     description: Deletes a risk mitigation by ID
 *     tags:
 *       - Risk Mitigations
 *     parameters:
 *       - in: path
 *         name: mitigation_id
 *         required: true
 *         description: ID of the risk mitigation to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Risk mitigation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mitigation deleted successfully
 *                 deleted:
 *                   type: object
 *       400:
 *         description: Delete failed
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ mitigation_id: string }> }) {
  const resolvedParams = await context.params;
  const { mitigation_id } = resolvedParams;
  try {
    const deleted = await prisma.riskMitigation.delete({
      where: { mitigation_id: Number(mitigation_id) },
    });
    return NextResponse.json({ message: "Mitigation deleted successfully", deleted });
  } catch (error) {
    console.error("DELETE mitigation error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/riskMitigations/{mitigation_id}:
 *   patch:
 *     summary: Update risk mitigation status and assignment
 *     description: Updates the status, assigned user, and due date of a risk mitigation
 *     tags:
 *       - Risk Mitigations
 *     parameters:
 *       - in: path
 *         name: mitigation_id
 *         required: true
 *         description: ID of the risk mitigation to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: New status of the mitigation
 *               assigned_to:
 *                 type: integer
 *                 description: ID of the user to assign this mitigation to
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: New due date for the mitigation
 *     responses:
 *       200:
 *         description: Mitigation action updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mitigation action updated.
 *                 updatedMitigation:
 *                   type: object
 *       500:
 *         description: Server error
 */
export async function PATCH(req: Request, context: { params: Promise<{ mitigation_id: string }> }) {
  const resolvedParams = await context.params;
  const { mitigation_id } = resolvedParams;
  const { status, assigned_to, due_date } = await req.json();

  const updatedMitigation = await prisma.riskMitigation.update({
    where: { mitigation_id: parseInt(mitigation_id) },
    data: {
      status,
      assigned_to,
      due_date: due_date ? new Date(due_date) : undefined,
    },
  });

  return NextResponse.json({ message: "Mitigation action updated.", updatedMitigation });
}


