import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/evms:
 *   get:
 *     summary: Get all EVM (Earned Value Management) records
 *     description: Retrieves a list of all EVM records
 *     tags:
 *       - EVMS
 *     responses:
 *       200:
 *         description: List of EVM records retrieved successfully
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
 *                   fiscal_period:
 *                     type: string
 *                   planned_value:
 *                     type: number
 *                     format: float
 *                   earned_value:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   cost_performance_index:
 *                     type: number
 *                     format: float
 *                   schedule_performance_index:
 *                     type: number
 *                     format: float
 *                   estimate_at_completion:
 *                     type: number
 *                     format: float
 *                   estimate_to_complete:
 *                     type: number
 *                     format: float
 *                   variance_at_completion:
 *                     type: number
 *                     format: float
 *                   reporting_date:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const evms = await prisma.eVM.findMany({
      include: {
        project: true,
      },
    });
    return NextResponse.json(evms);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch EVMs" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/evms:
 *   post:
 *     summary: Create a new EVM record
 *     description: Creates a new Earned Value Management record
 *     tags:
 *       - EVMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - fiscal_period
 *               - planned_value
 *               - earned_value
 *               - actual_cost
 *               - cost_performance_index
 *               - schedule_performance_index
 *               - estimate_at_completion
 *               - estimate_to_complete
 *               - variance_at_completion
 *               - reporting_date
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
 *       201:
 *         description: EVM record created successfully
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
 *         description: Missing required fields or other error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.project_id || !data.fiscal_period || 
        data.planned_value === undefined || 
        data.earned_value === undefined || 
        data.actual_cost === undefined || 
        data.cost_performance_index === undefined || 
        data.schedule_performance_index === undefined || 
        data.estimate_at_completion === undefined || 
        data.estimate_to_complete === undefined || 
        data.variance_at_completion === undefined || 
        !data.reporting_date) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const newEVM = await prisma.eVM.create({
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

    return NextResponse.json(newEVM, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create EVM" }, { status: 400 });
  }
}
