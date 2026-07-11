import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/equipment-site-logs:
 *   get:
 *     summary: Get all equipment site logs
 *     description: Retrieves a list of all equipment site logs with resource, site, and user information
 *     tags:
 *       - Equipment Site Logs
 *     parameters:
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: integer
 *         description: Filter by resource ID
 *       - in: query
 *         name: equipment_only
 *         schema:
 *           type: boolean
 *         description: Filter to show only equipment resources (type='equipment')
 *     responses:
 *       200:
 *         description: List of equipment site logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   log_id:
 *                     type: integer
 *                   resource_id:
 *                     type: integer
 *                   site_id:
 *                     type: integer
 *                   logged_in_date:
 *                     type: string
 *                     format: date-time
 *                   logged_out_date:
 *                     type: string
 *                     format: date-time
 *                   usage_hours:
 *                     type: number
 *                   condition_before:
 *                     type: string
 *                   condition_after:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   resource:
 *                     type: object
 *                   site:
 *                     type: object
 *                   user:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {
    console.log('Equipment Site Logs API: Starting fetch...');
    
    // First, let's check if there are any equipment site logs at all
    const totalLogs = await prisma.equipmentSiteLog.count();
    console.log('Equipment Site Logs API: Total logs in database:', totalLogs);
    
    // Check if there are any equipment-type resources
    const equipmentResources = await prisma.resource.findMany({
      where: {
        type: 'equipment'
      }
    });
    console.log('Equipment Site Logs API: Equipment resources count:', equipmentResources.length);
    console.log('Equipment Site Logs API: Equipment resources:', equipmentResources);
    
    // Now get the actual equipment site logs
    const equipmentSiteLogs = await prisma.equipmentSiteLog.findMany({
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

    console.log('Equipment Site Logs API: Raw data count:', equipmentSiteLogs.length);
    console.log('Equipment Site Logs API: First few records:', equipmentSiteLogs.slice(0, 3));
    
    // Check resource types
    const resourceTypes = equipmentSiteLogs.map(log => log.resource?.type).filter(Boolean);
    console.log('Equipment Site Logs API: Resource types found:', [...new Set(resourceTypes)]);
    
    // Filter for equipment type resources
    const equipmentLogs = equipmentSiteLogs.filter(log => log.resource?.type === 'equipment');
    console.log('Equipment Site Logs API: Equipment logs count:', equipmentLogs.length);

    return NextResponse.json(equipmentSiteLogs);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch equipment site logs" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/equipment-site-logs:
 *   post:
 *     summary: Create new equipment site log
 *     description: Creates a new equipment site log entry for tracking equipment usage per site
 *     tags:
 *       - Equipment Site Logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *               - site_id
 *               - logged_in_date
 *               - logged_by
 *             properties:
 *               resource_id:
 *                 type: integer
 *                 description: ID of the resource (equipment) being logged
 *               site_id:
 *                 type: integer
 *                 description: ID of the site where equipment is logged
 *               logged_in_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when equipment was logged into the site
 *               logged_out_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when equipment was logged out of the site (optional)
 *               usage_hours:
 *                 type: number
 *                 description: Number of hours equipment was used
 *               condition_before:
 *                 type: string
 *                 description: Condition of equipment before use
 *               condition_after:
 *                 type: string
 *                 description: Condition of equipment after use
 *               notes:
 *                 type: string
 *                 description: Additional notes about the equipment usage
 *               logged_by:
 *                 type: integer
 *                 description: ID of the user who created the log entry
 *     responses:
 *       201:
 *         description: Equipment site log created successfully
 *       400:
 *         description: Missing required fields or validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.resource_id || !data.site_id || !data.logged_in_date || !data.logged_by) {
      return NextResponse.json({ 
        error: "Missing required fields: resource_id, site_id, logged_in_date, logged_by" 
      }, { status: 400 });
    }

    // Check if resource exists and is equipment type
    const resource = await prisma.resource.findUnique({
        where: {
            resource_id: data.resource_id,
            type: 'equipment'
       }
    });

    if (!resource) {
      return NextResponse.json({ 
        error: "Resource not found" 
      }, { status: 400 });
    }

    if (resource.type !== 'equipment') {
      return NextResponse.json({ 
        error: "Resource must be of type 'equipment'" 
      }, { status: 400 });
    }

    // Check if site exists
    const site = await prisma.site.findUnique({
      where: { site_id: data.site_id }
    });

    if (!site) {
      return NextResponse.json({ 
        error: "Site not found" 
      }, { status: 400 });
    }

    // Create the equipment site log
    const newEquipmentSiteLog = await prisma.equipmentSiteLog.create({
      data: {
        resource_id: data.resource_id,
        site_id: data.site_id,
        logged_in_date: new Date(data.logged_in_date),
        logged_out_date: data.logged_out_date ? new Date(data.logged_out_date) : null,
        usage_hours: data.usage_hours,
        condition_before: data.condition_before,
        condition_after: data.condition_after,
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

    return NextResponse.json(newEquipmentSiteLog, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create equipment site log" }, { status: 400 });
  }
} 