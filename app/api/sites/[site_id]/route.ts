import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/sites/{site_id}:
 *   get:
 *     summary: Get a specific site by ID
 *     description: Retrieves a single site with its project, manager, and equipment logs
 *     tags:
 *       - Sites
 *     parameters:
 *       - in: path
 *         name: site_id
 *         required: true
 *         description: ID of the site to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Site retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 site_id:
 *                   type: integer
 *                 site_code:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 address:
 *                   type: string
 *                 project_id:
 *                   type: integer
 *                 manager_id:
 *                   type: integer
 *                 is_active:
 *                   type: boolean
 *                 project:
 *                   type: object
 *                 manager:
 *                   type: object
 *                 equipment_logs:
 *                   type: array
 *       404:
 *         description: Site not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ site_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { site_id } = resolvedParams;
    const siteId = parseInt(site_id);
    
    if (!siteId) {
      return NextResponse.json({ error: "Invalid site ID" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { site_id: siteId },
      include: {
        project: true,
        manager: true,
        equipment_logs: {
          include: {
            resource: true,
            user: true
          },
          orderBy: {
            logged_in_date: 'desc'
          }
        }
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/sites/{site_id}:
 *   put:
 *     summary: Update a specific site
 *     description: Updates a site's information
 *     tags:
 *       - Sites
 *     parameters:
 *       - in: path
 *         name: site_id
 *         required: true
 *         description: ID of the site to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               site_code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               project_id:
 *                 type: integer
 *               manager_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Site updated successfully
 *       404:
 *         description: Site not found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ site_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { site_id } = resolvedParams;
    const siteId = parseInt(site_id);
    const data = await req.json();
    
    if (isNaN(siteId)) {
      return NextResponse.json({ error: "Invalid site ID" }, { status: 400 });
    }

    const updatedSite = await prisma.site.update({
      where: { site_id: siteId },
      data: {
        site_code: data.site_code,
        name: data.name,
        description: data.description,
        address: data.address,
        project_id: data.project_id,
        manager_id: data.manager_id,
        is_active: data.is_active,
      },
      include: {
        project: true,
        manager: true,
        equipment_logs: true,
      },
    });

    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/sites/{site_id}:
 *   delete:
 *     summary: Delete a specific site
 *     description: Deletes a site (soft delete by setting is_active to false)
 *     tags:
 *       - Sites
 *     parameters:
 *       - in: path
 *         name: site_id
 *         required: true
 *         description: ID of the site to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Site deleted successfully
 *       404:
 *         description: Site not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ site_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { site_id } = resolvedParams;
    const siteId = parseInt(site_id);
    
    if (isNaN(siteId)) {
      return NextResponse.json({ error: "Invalid site ID" }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const deletedSite = await prisma.site.update({
      where: { site_id: siteId },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "Site deleted successfully", deletedSite });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 });
  }
} 