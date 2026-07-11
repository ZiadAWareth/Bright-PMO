import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all financial transactions
 *     description: Retrieves all financial transactions from the database
 *     tags:
 *       - Transactions
 *     responses:
 *       200:
 *         description: List of all transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transaction_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   amount:
 *                     type: number
 *                     format: float
 *                   category:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   description:
 *                     type: string
 *       500:
 *         description: Server error
 *   post:
 *     summary: Log a new financial transaction
 *     description: Creates a new financial transaction and updates the corresponding budget. Automatically triggers budget report update.
 *     tags:
 *       - Transactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - actual_amount
 *               - cost_type
 *               - fiscal_year
 *               - fiscal_period
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project associated with the transaction
 *               wbs_id:
 *                 type: integer
 *                 description: Optional ID of the WBS associated with the transaction
 *               task_id:
 *                 type: integer
 *                 description: Optional ID of the task associated with the transaction
 *               cost_type:
 *                 type: string
 *                 description: Type of cost (e.g., labor, material, equipment)
 *               planned_amount:
 *                 type: number
 *                 format: float
 *                 description: Planned amount for budget reference
 *               actual_amount:
 *                 type: number
 *                 format: float
 *                 description: Actual amount spent in this transaction
 *               fiscal_year:
 *                 type: integer
 *                 description: Fiscal year for the transaction
 *               fiscal_period:
 *                 type: string
 *                 description: Fiscal period (e.g., Q1, Q2, Q3, Q4)
 *     responses:
 *       201:
 *         description: Transaction logged successfully and budget updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: integer
 *                     project_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                       format: float
 *                     category:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                 updatedBudget:
 *                   type: object
 *                   properties:
 *                     budget_id:
 *                       type: integer
 *                     actual_amount:
 *                       type: number
 *                       format: float
 *       404:
 *         description: Budget not found for the specified project/WBS/task
 *       500:
 *         description: Server error
 */

// GET /transactions - Endpoint to fetch all financial transactions
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /transactions - Endpoint to log a new financial transaction and update the budget
export async function POST(req: Request) {
  try {
    // Parse the request body to extract transaction and budget details
    const { project_id, wbs_id, task_id, cost_type, planned_amount, actual_amount, fiscal_year, fiscal_period } = await req.json();

    // Save the transaction in the database
    const transaction = await prisma.transaction.create({
      data: {
        project_id, // The project associated with the transaction
        amount: actual_amount, // The amount spent in this transaction
        category: cost_type, // The type of cost (e.g., labor, material)
        date: new Date(), // Automatically set the transaction date to now
        description: 'Transaction logged', // A default description for the transaction
      },
    });

    // Fetch the budget record based on project_id, wbs_id, and task_id
    const budget = await prisma.budget.findFirst({
      where: { project_id, wbs_id, task_id },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Update the actual spend in the corresponding budget
    const updatedBudget = await prisma.budget.update({
      where: { budget_id: budget.budget_id }, // Use the unique budget_id
      data: {
        actual_amount: {
          increment: actual_amount, // Increment the actual amount by the transaction amount
        },
      },
    });

    // Trigger the budget report update process
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/budget/report`, { method: 'POST' });

    // Return the created transaction and updated budget as the response
    return NextResponse.json({ transaction, updatedBudget }, { status: 201 });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error('Error posting transaction:', error);
    return NextResponse.json({ error: 'Failed to post transaction' }, { status: 500 });
  }
}
