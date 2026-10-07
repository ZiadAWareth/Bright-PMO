import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/maintenance-logs:
 *   get:
 *     summary: Get all maintenance logs
 *     description: Retrieves a list of all maintenance logs with resource, schedule, and technician information
 *     tags:
 *       - Maintenance Logs
 *     parameters:
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: integer
 *         description: Filter by resource ID
 *       - in: query
 *         name: schedule_id
 *         schema:
 *           type: integer
 *         description: Filter by maintenance schedule ID
 *       - in: query
 *         name: equipment_only
 *         schema:
 *           type: boolean
 *         description: Filter to show only equipment resources (type='equipment')
 *     responses:
 *       200:
 *         description: List of maintenance logs retrieved successfully
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      include: {
        resource: true,
        schedule: true,
        technician: true
      },
      orderBy: {
        performed_date: 'desc'
      }
    });

    return NextResponse.json(maintenanceLogs);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance logs" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/maintenance-logs:
 *   post:
 *     summary: Create new maintenance log
 *     description: Creates a new maintenance log entry for recording completed maintenance work
 *     tags:
 *       - Maintenance Logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *               - maintenance_type
 *               - performed_date
 *               - performed_by
 *               - work_description
 *             properties:
 *               schedule_id:
 *                 type: integer
 *                 description: ID of the maintenance schedule (optional for unscheduled maintenance)
 *               resource_id:
 *                 type: integer
 *                 description: ID of the resource (equipment) that was maintained
 *               maintenance_type:
 *                 type: string
 *                 enum: [routine, repair, inspection, compliance, emergency]
 *                 description: Type of maintenance performed
 *               performed_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when maintenance was performed
 *               performed_by:
 *                 type: integer
 *                 description: ID of the technician who performed the maintenance
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
 *               condition_before:
 *                 type: string
 *                 description: Condition of equipment before maintenance
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
 *       201:
 *         description: Maintenance log created successfully
 *       400:
 *         description: Missing required fields or validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.resource_id || !data.maintenance_type || !data.performed_date || !data.performed_by || !data.work_description) {
      return NextResponse.json({ 
        error: "Missing required fields: resource_id, maintenance_type, performed_date, performed_by, work_description" 
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
        error: "Maintenance logs can only be created for equipment resources" 
      }, { status: 400 });
    }

    // Check if schedule exists (if provided)
    if (data.schedule_id) {
      const schedule = await prisma.maintenanceSchedule.findUnique({
        where: { schedule_id: data.schedule_id }
      });

      if (!schedule) {
        return NextResponse.json({ 
          error: "Maintenance schedule not found" 
        }, { status: 400 });
      }
    }

    // Check if technician exists
    const technician = await prisma.account.findUnique({
      where: { account_id: data.performed_by }
    });

    if (!technician) {
      return NextResponse.json({ 
        error: "Technician account not found" 
      }, { status: 400 });
    }

    // Create the maintenance log
    const newMaintenanceLog = await prisma.maintenanceLog.create({
      data: {
        schedule_id: data.schedule_id || null,
        resource_id: data.resource_id,
        maintenance_type: data.maintenance_type,
        performed_date: new Date(data.performed_date),
        performed_by: data.performed_by,
        work_description: data.work_description,
        parts_used: data.parts_used,
        labor_hours: data.labor_hours,
        parts_cost: data.parts_cost,
        labor_cost: data.labor_cost,
        total_cost: data.total_cost,
        condition_before: data.condition_before,
        condition_after: data.condition_after,
        next_service_date: data.next_service_date ? new Date(data.next_service_date) : null,
        notes: data.notes,
      },
      include: {
        resource: true,
        schedule: true,
        technician: true,
      },
    });

    return NextResponse.json(newMaintenanceLog, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create maintenance log" }, { status: 400 });
  }
} 