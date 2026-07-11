import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/alerts/escalation:
 *   post:
 *     summary: Escalate unresolved alerts
 *     description: Escalates unresolved alerts that are older than 24 hours to senior management
 *     tags:
 *       - Alerts
 *     responses:
 *       200:
 *         description: Escalations processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Escalations processed
 *       500:
 *         description: Server error
 */
// POST /alerts/escalation - Endpoint to escalate unresolved alerts to senior management
export async function POST() {
  try {
    // Fetch all unresolved alerts that have not been escalated and are older than 24 hours
    const unresolvedAlerts = await prisma.alert.findMany({
      where: {
        resolvedAt: null, // Alert is not resolved
        escalated: false, // Alert has not been escalated yet
        triggeredAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Triggered more than 24 hours ago
        },
      },
    });

    for (const alert of unresolvedAlerts) {
      // Mark the alert as escalated in the database
      await prisma.alert.update({
        where: { id: alert.id },
        data: { escalated: true },
      });

      // Notify senior management (e.g., via email or Slack - implementation not shown here)
      console.log('Escalation triggered for alert:', alert.id);
    }

    // Return a success message after processing all escalations
    return NextResponse.json({ message: 'Escalations processed' });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error('Error processing escalations:', error);
    return NextResponse.json({ error: 'Failed to process escalations' }, { status: 500 });
  }
}