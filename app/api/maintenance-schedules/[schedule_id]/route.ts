import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/maintenance-schedules/{schedule_id}:
 *   get:
 *     summary: Get a specific maintenance schedule by ID
 *     description: Retrieves a single maintenance schedule with resource and maintenance logs
 *     tags:
 *       - Maintenance Schedules
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the maintenance schedule to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance schedule retrieved successfully
 *       404:
 *         description: Maintenance schedule not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ schedule_id: string }> }) {
  const resolvedParams = await context.params;
  const { schedule_id } = resolvedParams;
  try {
    const scheduleId = parseInt(schedule_id);

    if (!scheduleId) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const maintenanceSchedule = await prisma.maintenanceSchedule.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        resource: true,
        maintenance_logs: {
          include: {
            technician: true
          },
          orderBy: {
            performed_date: 'desc'
          }
        }
      }
    });

    if (!maintenanceSchedule) {
      return NextResponse.json({ error: "Maintenance schedule not found" }, { status: 404 });
    }

    return NextResponse.json(maintenanceSchedule);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance schedule" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/maintenance-schedules/{schedule_id}:
 *   put:
 *     summary: Update a specific maintenance schedule
 *     description: Updates a maintenance schedule (useful for changing due dates, status, etc.)
 *     tags:
 *       - Maintenance Schedules
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the maintenance schedule to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               next_due_date:
 *                 type: string
 *                 format: date-time
 *                 description: When maintenance is next due
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, overdue, cancelled]
 *                 description: Status of the maintenance schedule
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Priority level
 *               description:
 *                 type: string
 *                 description: Description of the maintenance work
 *               estimated_hours:
 *                 type: number
 *                 description: Estimated hours for maintenance
 *               estimated_cost:
 *                 type: number
 *                 description: Estimated cost for maintenance
 *     responses:
 *       200:
 *         description: Maintenance schedule updated successfully
 *       404:
 *         description: Maintenance schedule not found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ schedule_id: string }> }) {
  const resolvedParams = await context.params;
  const { schedule_id } = resolvedParams;
  try {
    const scheduleId = parseInt(schedule_id);
    const data = await req.json();
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const updatedSchedule = await prisma.maintenanceSchedule.update({
      where: { schedule_id: scheduleId },
      data: {
        next_due_date: data.next_due_date ? new Date(data.next_due_date) : undefined,
        status: data.status,
        priority: data.priority,
        description: data.description,
        estimated_hours: data.estimated_hours,
        estimated_cost: data.estimated_cost,
      },
      include: {
        resource: true,
        maintenance_logs: {
          include: {
            technician: true
          },
          orderBy: {
            performed_date: 'desc'
          }
        }
      },
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update maintenance schedule" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/maintenance-schedules/{schedule_id}:
 *   delete:
 *     summary: Delete a specific maintenance schedule
 *     description: Deletes a maintenance schedule (note - this will also delete associated maintenance logs)
 *     tags:
 *       - Maintenance Schedules
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the maintenance schedule to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance schedule deleted successfully
 *       404:
 *         description: Maintenance schedule not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ schedule_id: string }> }) {
  const resolvedParams = await context.params;
  const { schedule_id } = resolvedParams;
  try {
    const scheduleId = parseInt(schedule_id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    // Check if the schedule exists
    const existingSchedule = await prisma.maintenanceSchedule.findUnique({
      where: { schedule_id: scheduleId }
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: "Maintenance schedule not found" }, { status: 404 });
    }

    // Delete the maintenance schedule (maintenance logs will be deleted due to cascade)
    await prisma.maintenanceSchedule.delete({
      where: { schedule_id: scheduleId }
    });

    return NextResponse.json({ message: "Maintenance schedule deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete maintenance schedule" }, { status: 500 });
  }
} 