import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/maintenance-schedules:
 *   get:
 *     summary: Get all maintenance schedules
 *     description: Retrieves a list of all maintenance schedules with resource information
 *     tags:
 *       - Maintenance Schedules
 *     parameters:
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: integer
 *         description: Filter by resource ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, overdue, cancelled]
 *         description: Filter by maintenance status
 *       - in: query
 *         name: equipment_only
 *         schema:
 *           type: boolean
 *         description: Filter to show only equipment resources (type='equipment')
 *     responses:
 *       200:
 *         description: List of maintenance schedules retrieved successfully
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {

    const maintenanceSchedules = await prisma.maintenanceSchedule.findMany({
      include: {
        resource: true,
        maintenance_logs: {
          orderBy: {
            performed_date: 'desc'
          }
        }
      },
      orderBy: {
        next_due_date: 'asc'
      }
    });

    return NextResponse.json(maintenanceSchedules);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance schedules" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/maintenance-schedules:
 *   post:
 *     summary: Create new maintenance schedule
 *     description: Creates a new maintenance schedule for equipment
 *     tags:
 *       - Maintenance Schedules
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *               - maintenance_type
 *               - trigger_type
 *               - trigger_value
 *               - next_due_date
 *             properties:
 *               resource_id:
 *                 type: integer
 *                 description: ID of the resource (equipment) for maintenance
 *               maintenance_type:
 *                 type: string
 *                 enum: [routine, repair, inspection, compliance, emergency]
 *                 description: Type of maintenance
 *               trigger_type:
 *                 type: string
 *                 enum: [time_based, usage_based, condition_based, regulatory]
 *                 description: What triggers this maintenance
 *               trigger_value:
 *                 type: string
 *                 description: Trigger value (e.g., "30 days", "100 hours")
 *               next_due_date:
 *                 type: string
 *                 format: date-time
 *                 description: When maintenance is next due
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Priority level (defaults to medium)
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
 *       201:
 *         description: Maintenance schedule created successfully
 *       400:
 *         description: Missing required fields or validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.resource_id || !data.maintenance_type || !data.trigger_type || !data.trigger_value || !data.next_due_date) {
      return NextResponse.json({ 
        error: "Missing required fields: resource_id, maintenance_type, trigger_type, trigger_value, next_due_date" 
      }, { status: 400 });
    }

    // Check if resource exists and is equipment type
    const resource = await prisma.resource.findUnique({
      where: { resource_id: data.resource_id }
    });

    if (!resource) {
      return NextResponse.json({ 
        error: "Resource not found" 
      }, { status: 400 });
    }

    if (resource.type !== 'equipment') {
      return NextResponse.json({ 
        error: "Maintenance schedules can only be created for equipment resources" 
      }, { status: 400 });
    }

    // Create the maintenance schedule
    const newMaintenanceSchedule = await prisma.maintenanceSchedule.create({
      data: {
        resource_id: data.resource_id,
        maintenance_type: data.maintenance_type,
        trigger_type: data.trigger_type,
        trigger_value: data.trigger_value,
        next_due_date: new Date(data.next_due_date),
        priority: data.priority || 'medium',
        description: data.description,
        estimated_hours: data.estimated_hours,
        estimated_cost: data.estimated_cost,
      },
      include: {
        resource: true,
        maintenance_logs: true,
      },
    });

    return NextResponse.json(newMaintenanceSchedule, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create maintenance schedule" }, { status: 400 });
  }
} 