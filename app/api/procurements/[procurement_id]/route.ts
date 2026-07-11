// app/api/procurements/[procurement_id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/procurements/{procurement_id}:
 *   get:
 *     summary: Get a procurement by ID
 *     description: Retrieves a specific procurement by its ID with related data
 *     tags:
 *       - Procurements
 *     parameters:
 *       - in: path
 *         name: procurement_id
 *         required: true
 *         description: ID of the procurement to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Procurement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 procurement_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 wbs_id:
 *                   type: integer
 *                 type:
 *                   type: string
 *                   enum: [material, service, equipment]
 *                 description:
 *                   type: string
 *                 estimated_cost:
 *                   type: number
 *                   format: float
 *                 actual_cost:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: string
 *                 project:
 *                   type: object
 *                 wbs:
 *                   type: object
 *                 contracts:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Procurement not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ procurement_id: string }> }) {
  const resolvedParams = await context.params;
  const { procurement_id } = resolvedParams;
  try {
    const procurement = await prisma.procurement.findUnique({
      where: { procurement_id: Number(procurement_id) },
      include: {
        project: true,
        wbs: true,
        contracts: true,
      },
    });

    if (!procurement) {
      return NextResponse.json({ error: "Procurement not found" }, { status: 404 });
    }

    return NextResponse.json(procurement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch procurement" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/procurements/{procurement_id}:
 *   put:
 *     summary: Update a procurement
 *     description: Updates an existing procurement by ID
 *     tags:
 *       - Procurements
 *     parameters:
 *       - in: path
 *         name: procurement_id
 *         required: true
 *         description: ID of the procurement to update
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
 *                 description: ID of the project this procurement belongs to
 *               wbs_id:
 *                 type: integer
 *                 description: ID of the WBS this procurement belongs to
 *               type:
 *                 type: string
 *                 enum: [material, service, equipment]
 *                 description: Type of procurement
 *               description:
 *                 type: string
 *                 description: Description of what is being procured
 *               estimated_cost:
 *                 type: number
 *                 format: float
 *                 description: Estimated cost of the procurement
 *               actual_cost:
 *                 type: number
 *                 format: float
 *                 description: Actual cost of the procurement
 *               status:
 *                 type: string
 *                 description: Current status of the procurement
 *     responses:
 *       200:
 *         description: Procurement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 procurement_id:
 *                   type: integer
 *                 type:
 *                   type: string
 *                 estimated_cost:
 *                   type: number
 *                   format: float
 *       400:
 *         description: Failed to update procurement
 *       404:
 *         description: Procurement not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ procurement_id: string }> }) {
  const resolvedParams = await context.params;
  const { procurement_id } = resolvedParams;
  try {
    const data = await req.json();
    const updatedProcurement = await prisma.procurement.update({
      where: { procurement_id: Number(procurement_id) },
      data: {
        project_id: data.project_id,
        wbs_id: data.wbs_id,
        type: data.type,
        description: data.description,
        estimated_cost: data.estimated_cost,
        actual_cost: data.actual_cost,
        status: data.status,
      },
      include: {
        project: true,
        wbs: true,
        contracts: true,
      },
    });

    return NextResponse.json(updatedProcurement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update procurement" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/procurements/{procurement_id}:
 *   delete:
 *     summary: Delete a procurement
 *     description: Deletes a procurement by ID
 *     tags:
 *       - Procurements
 *     parameters:
 *       - in: path
 *         name: procurement_id
 *         required: true
 *         description: ID of the procurement to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Procurement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Procurement deleted successfully
 *                 deletedProcurement:
 *                   type: object
 *       400:
 *         description: Failed to delete procurement
 *       404:
 *         description: Procurement not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ procurement_id: string }> }) {
  const resolvedParams = await context.params;
  const { procurement_id } = resolvedParams;
  try {
    const deletedProcurement = await prisma.procurement.delete({
      where: { procurement_id: Number(procurement_id) },
    });

    return NextResponse.json({ message: "Procurement deleted successfully", deletedProcurement });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete procurement" }, { status: 400 });
  }
}