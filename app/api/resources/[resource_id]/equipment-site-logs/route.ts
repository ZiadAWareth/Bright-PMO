import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/resources/{resource_id}/equipment-site-logs:
 *   get:
 *     summary: Get all equipment site logs for a specific resource
 *     description: Retrieves all site logs for a specific equipment resource
 *     tags:
 *       - Resource Tracking
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to get site logs for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipment site logs retrieved successfully
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

    const equipmentSiteLogs = await prisma.equipmentSiteLog.findMany({
      where: { resource_id: resourceId },
      include: {
        resource: true,
        site: {
          include: {
            project: true,
            manager: true
          }
        },
        user: true
      },
      orderBy: {
        logged_in_date: 'desc'
      }
    });

    return NextResponse.json(equipmentSiteLogs);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment site logs" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/resources/{resource_id}/equipment-site-logs:
 *   post:
 *     summary: Create a new equipment site log for a specific resource
 *     description: Creates a new site log for the specified equipment resource
 *     tags:
 *       - Resource Tracking
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to create site log for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - site_id
 *               - logged_in_date
 *               - logged_by
 *             properties:
 *               site_id:
 *                 type: integer
 *                 description: ID of the site where equipment is being logged
 *               logged_in_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when equipment was logged into the site
 *               logged_by:
 *                 type: integer
 *                 description: Account ID of user logging the equipment
 *               condition_before:
 *                 type: string
 *                 description: Condition of equipment before deployment
 *               notes:
 *                 type: string
 *                 description: Additional notes about the equipment deployment
 *     responses:
 *       201:
 *         description: Equipment site log created successfully
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

    // Verify site exists
    if (data.site_id) {
      const site = await prisma.site.findUnique({
        where: { site_id: data.site_id }
      });

      if (!site) {
        return NextResponse.json({ error: "Site not found" }, { status: 400 });
      }
    }

    // Verify user account exists
    if (data.logged_by) {
      const user = await prisma.account.findUnique({
        where: { account_id: data.logged_by }
      });

      if (!user) {
        return NextResponse.json({ error: "User account not found" }, { status: 400 });
      }
    }

    const newLog = await prisma.equipmentSiteLog.create({
      data: {
        resource_id: resourceId,
        site_id: data.site_id,
        logged_in_date: new Date(data.logged_in_date),
        condition_before: data.condition_before,
        notes: data.notes,
        logged_by: data.logged_by,
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

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create equipment site log" },
      { status: 500 }
    );
  }
} 