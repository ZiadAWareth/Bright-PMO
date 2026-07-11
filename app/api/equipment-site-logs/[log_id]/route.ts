import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/equipment-site-logs/{log_id}:
 *   get:
 *     summary: Get a specific equipment site log by ID
 *     description: Retrieves a single equipment site log with resource, site, and user information
 *     tags:
 *       - Equipment Site Logs
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         description: ID of the equipment site log to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipment site log retrieved successfully
 *       404:
 *         description: Equipment site log not found
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

    const equipmentSiteLog = await prisma.equipmentSiteLog.findUnique({
        where: {
            log_id: logId,
       },
      include: {
        resource: true,
        site: {
          include: {
            project: true,
            manager: true
          }
        },
        user: true
      }
    });
      
    if (equipmentSiteLog?.resource.type !== 'equipment') {
        return NextResponse.json({ error: "Resource is not an equipment" }, { status: 400 });
    }
    
    if (!equipmentSiteLog) {
      return NextResponse.json({ error: "Equipment site log not found" }, { status: 404 });
    }

    return NextResponse.json(equipmentSiteLog);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch equipment site log" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/equipment-site-logs/{log_id}:
 *   put:
 *     summary: Update a specific equipment site log
 *     description: Updates an equipment site log (useful for logging equipment out or updating conditions)
 *     tags:
 *       - Equipment Site Logs
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         description: ID of the equipment site log to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logged_out_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when equipment was logged out of the site
 *               usage_hours:
 *                 type: number
 *                 description: Number of hours equipment was used
 *               condition_after:
 *                 type: string
 *                 description: Condition of equipment after use
 *               notes:
 *                 type: string
 *                 description: Additional notes about the equipment usage
 *     responses:
 *       200:
 *         description: Equipment site log updated successfully
 *       404:
 *         description: Equipment site log not found
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
    
    const updatedLog = await prisma.equipmentSiteLog.update({
      where: { log_id: logId },
      data: {
        logged_out_date: data.logged_out_date ? new Date(data.logged_out_date) : undefined,
        usage_hours: data.usage_hours,
        condition_after: data.condition_after,
        notes: data.notes,
      },
      include: {
        resource: true,
        site: {
          include: {
            project: true,
            manager: true
          }
        },
        user: true,
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update equipment site log" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/equipment-site-logs/{log_id}:
 *   delete:
 *     summary: Delete a specific equipment site log
 *     description: Deletes a single equipment site log
 *     tags:
 *       - Equipment Site Logs
 *     parameters:
 *       - in: path
 *         name: log_id
 *         required: true
 *         description: ID of the equipment site log to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipment site log deleted successfully
 *       404:
 *         description: Equipment site log not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ log_id: string }> }) {
  const resolvedParams = await context.params;
  const { log_id } = resolvedParams;
  try {
    const logId = parseInt(log_id);
    
    if (!logId) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
    }

    const equipmentSiteLog = await prisma.equipmentSiteLog.findUnique({
      where: {
        log_id: logId,
      },
    });

    if (!equipmentSiteLog) {
      return NextResponse.json({ error: "Equipment site log not found" }, { status: 404 });
    }

    await prisma.equipmentSiteLog.delete({
      where: {
        log_id: logId,
      },
    });

    return NextResponse.json({ message: "Equipment site log deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete equipment site log" }, { status: 500 });
  }
} 