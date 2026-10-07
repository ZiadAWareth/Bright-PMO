import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/evms/{evm_id}:
 *   get:
 *     summary: Get an EVM record by ID
 *     description: Retrieves a specific EVM record by its ID
 *     tags:
 *       - EVMS
 *     parameters:
 *       - in: path
 *         name: evm_id
 *         required: true
 *         description: ID of the EVM record to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EVM record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evm_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 fiscal_period:
 *                   type: string
 *                 planned_value:
 *                   type: number
 *                   format: float
 *                 earned_value:
 *                   type: number
 *                   format: float
 *                 actual_cost:
 *                   type: number
 *                   format: float
 *                 cost_performance_index:
 *                   type: number
 *                   format: float
 *                 schedule_performance_index:
 *                   type: number
 *                   format: float
 *                 estimate_at_completion:
 *                   type: number
 *                   format: float
 *                 estimate_to_complete:
 *                   type: number
 *                   format: float
 *                 variance_at_completion:
 *                   type: number
 *                   format: float
 *                 reporting_date:
 *                   type: string
 *                   format: date-time
 *                 project:
 *                   type: object
 *       404:
 *         description: EVM record not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ evm_id: string }> }) {
  const resolvedParams = await context.params;
  const { evm_id } = resolvedParams;
  try {
    const evm = await prisma.eVM.findUnique({
      where: { evm_id: Number(evm_id) },
      include: {
        project: true,
      },
    });

    if (!evm) {
      return NextResponse.json({ error: "EVM not found" }, { status: 404 });
    }

    return NextResponse.json(evm);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch EVM" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/evms/{evm_id}:
 *   put:
 *     summary: Update an EVM record
 *     description: Updates an existing EVM record by ID
 *     tags:
 *       - EVMS
 *     parameters:
 *       - in: path
 *         name: evm_id
 *         required: true
 *         description: ID of the EVM record to update
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
 *                 description: ID of the project this EVM record belongs to
 *               fiscal_period:
 *                 type: string
 *                 description: Fiscal period for this EVM record
 *               planned_value:
 *                 type: number
 *                 format: float
 *                 description: Planned value (PV)
 *               earned_value:
 *                 type: number
 *                 format: float
 *                 description: Earned value (EV)
 *               actual_cost:
 *                 type: number
 *                 format: float
 *                 description: Actual cost (AC)
 *               cost_performance_index:
 *                 type: number
 *                 format: float
 *                 description: Cost Performance Index (CPI)
 *               schedule_performance_index:
 *                 type: number
 *                 format: float
 *                 description: Schedule Performance Index (SPI)
 *               estimate_at_completion:
 *                 type: number
 *                 format: float
 *                 description: Estimate at Completion (EAC)
 *               estimate_to_complete:
 *                 type: number
 *                 format: float
 *                 description: Estimate to Complete (ETC)
 *               variance_at_completion:
 *                 type: number
 *                 format: float
 *                 description: Variance at Completion (VAC)
 *               reporting_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the EVM report
 *     responses:
 *       200:
 *         description: EVM record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evm_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 fiscal_period:
 *                   type: string
 *       400:
 *         description: Failed to update EVM record
 *       404:
 *         description: EVM record not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ evm_id: string }> }) {
  const resolvedParams = await context.params;
  const { evm_id } = resolvedParams;
  try {
    const data = await req.json();
    const updatedEVM = await prisma.eVM.update({
      where: { evm_id: Number(evm_id) },
      data: {
        project_id: data.project_id,
        fiscal_period: data.fiscal_period,
        planned_value: data.planned_value,
        earned_value: data.earned_value,
        actual_cost: data.actual_cost,
        cost_performance_index: data.cost_performance_index,
        schedule_performance_index: data.schedule_performance_index,
        estimate_at_completion: data.estimate_at_completion,
        estimate_to_complete: data.estimate_to_complete,
        variance_at_completion: data.variance_at_completion,
        reporting_date: new Date(data.reporting_date),
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(updatedEVM);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update EVM" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/evms/{evm_id}:
 *   delete:
 *     summary: Delete an EVM record
 *     description: Deletes an EVM record by ID
 *     tags:
 *       - EVMS
 *     parameters:
 *       - in: path
 *         name: evm_id
 *         required: true
 *         description: ID of the EVM record to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EVM record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: EVM deleted successfully
 *                 deletedEVM:
 *                   type: object
 *       400:
 *         description: Failed to delete EVM record
 *       404:
 *         description: EVM record not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ evm_id: string }> }) {
  const resolvedParams = await context.params;
  const { evm_id } = resolvedParams;
  try {
    const deletedEVM = await prisma.eVM.delete({
      where: { evm_id: Number(evm_id) },
    });

    return NextResponse.json({ message: "EVM deleted successfully", deletedEVM });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete EVM" }, { status: 400 });
  }
}
