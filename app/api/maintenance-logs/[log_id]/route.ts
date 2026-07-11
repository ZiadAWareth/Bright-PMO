import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/maintenance-logs/{log_id}:
 *   get:
 *     summary: Get a specific maintenance log by ID
 *     description: Retrieves a single maintenance log with resource, schedule, and technician information
 *     tags:
 *       - Maintenance Logs
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         description: ID of the maintenance log to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance log retrieved successfully
 *       404:
 *         description: Maintenance log not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ log_id: string }> }) {
  const resolvedParams = await context.params;
  const { log_id } = resolvedParams;
  try {
    const logId = parseInt(log_id);
    
    if (!logId) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
    }

    const maintenanceLog = await prisma.maintenanceLog.findUnique({
      where: { log_id: logId },
      include: {
        resource: true,
        schedule: true,
        technician: true
      }
    });

    if (!maintenanceLog) {
      return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });
    }

    return NextResponse.json(maintenanceLog);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance log" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/maintenance-logs/{log_id}:
 *   put:
 *     summary: Update a specific maintenance log
 *     description: Updates a maintenance log (useful for adding costs, updating notes, etc.)
 *     tags:
 *       - Maintenance Logs
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         description: ID of the maintenance log to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               work_description:
 *                 type: string
 *                 description: Description of the work performed
 *               parts_used:
 *                 type: string
 *                 description: Parts or materials used
 *               labor_hours:
 *                 type: number
 *                 description: Hours of labor spent
 *               parts_cost:
 *                 type: number
 *                 description: Cost of parts used
 *               labor_cost:
 *                 type: number
 *                 description: Cost of labor
 *               total_cost:
 *                 type: number
 *                 description: Total cost of maintenance
 *               condition_after:
 *                 type: string
 *                 description: Condition of equipment after maintenance
 *               next_service_date:
 *                 type: string
 *                 format: date-time
 *                 description: When next maintenance is due
 *               notes:
 *                 type: string
 *                 description: Additional notes about the maintenance work
 *     responses:
 *       200:
 *         description: Maintenance log updated successfully
 *       404:
 *         description: Maintenance log not found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ log_id: string }> }) {
  const resolvedParams = await context.params;
  const { log_id } = resolvedParams;
  try {
    const logId = parseInt(log_id);
    
    if (!logId) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
    }

    const data = await req.json();

    const updatedLog = await prisma.maintenanceLog.update({
      where: { log_id: logId },
      data: {
        work_description: data.work_description,
        parts_used: data.parts_used,
        labor_hours: data.labor_hours,
        parts_cost: data.parts_cost,
        labor_cost: data.labor_cost,
        total_cost: data.total_cost,
        condition_after: data.condition_after,
        next_service_date: data.next_service_date ? new Date(data.next_service_date) : undefined,
        notes: data.notes,
      },
      include: {
        resource: true,
        schedule: true,
        technician: true,
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update maintenance log" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ log_id: string }> }) {
  const resolvedParams = await context.params;
  const { log_id } = resolvedParams;
  // ... rest of the code ...
} 