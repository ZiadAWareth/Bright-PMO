import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/budget/report:
 *   post:
 *     summary: Update budget reports
 *     description: Recalculates actual spending and variance for all budgets, triggers alerts if thresholds are breached
 *     tags:
 *       - Budgets
 *     responses:
 *       200:
 *         description: Budget reports updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Budget report updated
 *       500:
 *         description: Server error
 */
export async function POST() {
  try {
    // Fetch all budgets from the database
    const budgets = await prisma.budget.findMany();

    for (const budget of budgets) {
      // Fetch all transactions related to the current budget's project
      const transactions = await prisma.transaction.findMany({
        where: { project_id: budget.project_id },
      });

      // Calculate the total actual spend by summing up all transaction amounts
      const actualSpend = transactions.reduce((sum, t) => sum + t.amount, 0);

      // Calculate the variance between planned and actual amounts
      const variance = actualSpend - budget.planned_amount;

      // Update the budget with the recalculated actual spend and variance
      await prisma.budget.update({
        where: { budget_id: budget.budget_id },
        data: { actual_amount: actualSpend, variance },
      });

      // Check if the actual spend exceeds the defined threshold percentage
      if (actualSpend / budget.planned_amount >= budget.threshold) {
        // Trigger an alert if the threshold is breached
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/alerts`, {
          method: 'POST',
          body: JSON.stringify({ project_id: budget.project_id }),
        });
      }
    }

    // Return a success message after processing all budgets
    return NextResponse.json({ message: 'Budget report updated' });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error('Error updating budget report:', error);
    return NextResponse.json({ error: 'Failed to update budget report' }, { status: 500 });
  }
}
