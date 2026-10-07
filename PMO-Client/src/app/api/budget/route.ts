import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/budget:
 *   get:
 *     summary: Get all budgets
 *     description: Retrieves a list of all project budgets
 *     tags:
 *       - Budgets
 *     responses:
 *       200:
 *         description: List of budgets retrieved successfully
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
 *                   task_id:
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
 *                   project:
 *                     type: object
 *                   wbs:
 *                     type: object
 *                   task:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      include: {
        project: true, // Include related project data
        wbs: true,     // Include related WBS data
        task: true,    // Include related Task data
      },
    });
    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/budget:
 *   post:
 *     summary: Create a new budget
 *     description: Creates a new budget entry for a project, WBS, or task
 *     tags:
 *       - Budgets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - cost_type
 *               - planned_amount
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this budget belongs to
 *               wbs_id:
 *                 type: integer
 *                 description: Optional ID of the WBS this budget belongs to
 *               task_id:
 *                 type: integer
 *                 description: Optional ID of the task this budget belongs to
 *               cost_type:
 *                 type: string
 *                 description: Type of cost (e.g., Labor, Materials, Equipment)
 *               planned_amount:
 *                 type: number
 *                 format: float
 *                 description: Planned budget amount
 *               actual_amount:
 *                 type: number
 *                 format: float
 *                 description: Actual spent amount
 *               variance:
 *                 type: number
 *                 format: float
 *                 description: Variance between planned and actual
 *               fiscal_year:
 *                 type: integer
 *                 description: Fiscal year for this budget
 *               fiscal_period:
 *                 type: string
 *                 description: Fiscal period (e.g., Q1, Q2, Q3, Q4)
 *     responses:
 *       201:
 *         description: Budget created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 budget_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 cost_type:
 *                   type: string
 *                 planned_amount:
 *                   type: number
 *                   format: float
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      project_id,
      wbs_id,
      task_id,
      cost_type,
      planned_amount,
      actual_amount,
      variance,
      fiscal_year,
      fiscal_period,
    } = data;

    // Validate required fields
    if (!project_id || !cost_type || planned_amount === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields: project_id, cost_type, and planned_amount are required" 
      }, { status: 400 });
    }

    const newBudget = await prisma.budget.create({
      data: {
        project_id,
        wbs_id,
        task_id,
        cost_type,
        planned_amount,
        actual_amount: actual_amount || 0,
        variance: variance || 0,
        fiscal_year,
        fiscal_period,
        threshold: 0,
        project: {
          connect: {
            project_id: project_id
          }
        }
      },
    });

    return NextResponse.json(newBudget, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}