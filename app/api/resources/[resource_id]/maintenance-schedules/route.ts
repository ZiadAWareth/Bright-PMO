import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/resources/{resource_id}/maintenance-schedules:
 *   get:
 *     summary: Get all maintenance schedules for a specific resource
 *     description: Retrieves all maintenance schedules for a specific equipment resource
 *     tags:
 *       - Resource Maintenance
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to get maintenance schedules for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance schedules retrieved successfully
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

    const maintenanceSchedules = await prisma.maintenanceSchedule.findMany({
      where: { resource_id: resourceId },
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
      orderBy: {
        next_due_date: 'asc'
      }
    });

    return NextResponse.json(maintenanceSchedules);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance schedules" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/resources/{resource_id}/maintenance-schedules:
 *   post:
 *     summary: Create a new maintenance schedule for a specific resource
 *     description: Creates a new maintenance schedule for the specified equipment resource
 *     tags:
 *       - Resource Maintenance
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to create maintenance schedule for
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
 *               - trigger_type
 *               - trigger_value
 *               - next_due_date
 *             properties:
 *               maintenance_type:
 *                 type: string
 *                 enum: [routine, repair, inspection, compliance, emergency]
 *               trigger_type:
 *                 type: string
 *                 enum: [time_based, usage_based, condition_based, regulatory]
 *               trigger_value:
 *                 type: string
 *                 description: "e.g., '30 days', '100 hours', 'quarterly'"
 *               next_due_date:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               description:
 *                 type: string
 *               estimated_hours:
 *                 type: number
 *               estimated_cost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Maintenance schedule created successfully
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

    const newSchedule = await prisma.maintenanceSchedule.create({
      data: {
        resource_id: resourceId,
        maintenance_type: data.maintenance_type,
        trigger_type: data.trigger_type,
        trigger_value: data.trigger_value,
        next_due_date: new Date(data.next_due_date),
        status: data.status || 'scheduled',
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

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance schedule" },
      { status: 500 }
    );
  }
} 