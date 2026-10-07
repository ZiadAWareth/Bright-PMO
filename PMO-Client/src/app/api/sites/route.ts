import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Get all sites
 *     description: Retrieves a list of all sites with their projects, managers, and equipment logs
 *     tags:
 *       - Sites
 *     responses:
 *       200:
 *         description: List of sites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   site_id:
 *                     type: integer
 *                   site_code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   address:
 *                     type: string
 *                   project_id:
 *                     type: integer
 *                   manager_id:
 *                     type: integer
 *                   is_active:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *                   manager:
 *                     type: object
 *                   equipment_logs:
 *                     type: array
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        project: true,
        manager: true,
        equipment_logs: {
          include: {
            resource: true,
            user: true
          }
        }
      },
    });
    return NextResponse.json(sites);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Create a new site
 *     description: Creates a new site in the system
 *     tags:
 *       - Sites
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - site_code
 *               - name
 *               - address
 *               - project_id
 *               - manager_id
 *             properties:
 *               site_code:
 *                 type: string
 *                 description: Unique site code
 *               name:
 *                 type: string
 *                 description: Site name
 *               description:
 *                 type: string
 *                 description: Site description
 *               address:
 *                 type: string
 *                 description: Site address
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this site belongs to
 *               manager_id:
 *                 type: integer
 *                 description: ID of the site manager
 *               is_active:
 *                 type: boolean
 *                 description: Whether the site is active
 *                 default: true
 *     responses:
 *       201:
 *         description: Site created successfully
 *       400:
 *         description: Missing required fields or validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.site_code || !data.name || !data.address || !data.project_id || !data.manager_id) {
      return NextResponse.json({ 
        error: "Missing required fields: site_code, name, address, project_id, manager_id" 
      }, { status: 400 });
    }

    const newSite = await prisma.site.create({
      data: {
        site_code: data.site_code,
        name: data.name,
        description: data.description,
        address: data.address,
        project_id: data.project_id,
        manager_id: data.manager_id,
        is_active: data.is_active ?? true,
      },
      include: {
        project: true,
        manager: true,
        equipment_logs: true,
      },
    });

    return NextResponse.json(newSite, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create site" }, { status: 400 });
  }
} 