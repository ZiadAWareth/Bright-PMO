import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/resources/{resource_id}/maintenance-logs:
 *   get:
 *     summary: Get all maintenance logs for a specific resource
 *     description: Retrieves all maintenance logs for a specific equipment resource
 *     tags:
 *       - Resource Maintenance
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to get maintenance logs for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance logs retrieved successfully
 *       404:
 *         description: Resource not found or not equipment type
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource_id: string }> }
) {
  try {
    const { resource_id } = await params;
    const resourceId = parseInt(resource_id);
    
    if (!resourceId) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    // Verify resource exists and is equipment type
    const resource = await prisma.resource.findUnique({
      where: { resource_id: resourceId }
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (resource.type !== 'equipment') {
      return NextResponse.json({ error: "Resource is not equipment type" }, { status: 400 });
    }

    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: { resource_id: resourceId },
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
    return NextResponse.json(
      { error: "Failed to fetch maintenance logs" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/resources/{resource_id}/maintenance-logs:
 *   post:
 *     summary: Create a new maintenance log for a specific resource
 *     description: Creates a new maintenance log for the specified equipment resource
 *     tags:
 *       - Resource Maintenance
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to create maintenance log for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maintenance_type
 *               - performed_date
 *               - performed_by
 *               - work_description
 *             properties:
 *               schedule_id:
 *                 type: integer
 *                 description: Optional - link to maintenance schedule
 *               maintenance_type:
 *                 type: string
 *                 enum: [routine, repair, inspection, compliance, emergency]
 *               performed_date:
 *                 type: string
 *                 format: date-time
 *               performed_by:
 *                 type: integer
 *                 description: Account ID of technician who performed maintenance
 *               work_description:
 *                 type: string
 *               parts_used:
 *                 type: string
 *               labor_hours:
 *                 type: number
 *               parts_cost:
 *                 type: number
 *               labor_cost:
 *                 type: number
 *               total_cost:
 *                 type: number
 *               condition_before:
 *                 type: string
 *               condition_after:
 *                 type: string
 *               next_service_date:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Maintenance log created successfully
 *       400:
 *         description: Invalid input or resource is not equipment
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource_id: string }> }
) {
  try {
    const { resource_id } = await params;
    const resourceId = parseInt(resource_id);
    const data = await request.json();
    
    if (!resourceId) {
      return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    // Verify resource exists and is equipment type
    const resource = await prisma.resource.findUnique({
      where: { resource_id: resourceId }
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (resource.type !== 'equipment') {
      return NextResponse.json({ error: "Resource must be equipment type" }, { status: 400 });
    }

    // Verify technician account exists if provided
    if (data.performed_by) {
      const technician = await prisma.account.findUnique({
        where: { account_id: data.performed_by }
      });

      if (!technician) {
        return NextResponse.json({ error: "Technician account not found" }, { status: 400 });
      }
    }

    // Verify schedule exists if provided
    if (data.schedule_id) {
      const schedule = await prisma.maintenanceSchedule.findUnique({
        where: { schedule_id: data.schedule_id }
      });

      if (!schedule) {
        return NextResponse.json({ error: "Maintenance schedule not found" }, { status: 400 });
      }

      if (schedule.resource_id !== resourceId) {
        return NextResponse.json({ error: "Schedule does not belong to this resource" }, { status: 400 });
      }
    }

    const newLog = await prisma.maintenanceLog.create({
      data: {
        resource_id: resourceId,
        schedule_id: data.schedule_id,
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

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance log" },
      { status: 500 }
    );
  }
} 