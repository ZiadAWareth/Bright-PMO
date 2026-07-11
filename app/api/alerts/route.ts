import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alerts
 *     description: Retrieves a list of all alerts in the system
 *     tags:
 *       - Alerts
 *     responses:
 *       200:
 *         description: A list of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   alert_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   triggeredAt:
 *                     type: string
 *                     format: date-time
 *                   recipients:
 *                     type: string
 *                     description: JSON string of recipient roles or IDs
 *       500:
 *         description: Server error
 */
// GET /api/alerts - Endpoint to fetch all alerts
export async function GET() {
  try {
    // Fetch all alerts from the database
    const alerts = await prisma.alert.findMany();

    // Return the list of alerts as the response
    return NextResponse.json(alerts, { status: 200 });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Create a new alert
 *     description: Creates a new alert for budget threshold breach
 *     tags:
 *       - Alerts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project that triggered the alert
 *     responses:
 *       201:
 *         description: Alert created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alert_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 triggeredAt:
 *                   type: string
 *                   format: date-time
 *                 recipients:
 *                   type: string
 *       500:
 *         description: Server error
 */
// POST /alerts - Endpoint to create an alert when a budget threshold is breached
export async function POST(req: Request) {
  try {
    // Parse the request body to extract the project ID
    const { project_id } = await req.json();

    // Create a new alert in the database
    const alert = await prisma.alert.create({
      data: {
        project_id, // The project associated with the alert
        triggeredAt: new Date(), // Automatically set the alert trigger time to now
        recipients: JSON.stringify(['Finance Manager', 'Project Manager']), // Default recipients for the alert
      },
    });

    // Notify the recipients (e.g., via email or Slack - implementation not shown here)
    console.log('Alert triggered for project:', project_id);

    // Return the created alert as the response
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    // Log and return an error response if something goes wrong
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}