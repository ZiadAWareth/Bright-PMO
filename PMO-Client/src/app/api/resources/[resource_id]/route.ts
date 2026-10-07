import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/resources/{resource_id}:
 *   get:
 *     summary: Get a resource by ID
 *     description: Retrieves a specific resource by its ID
 *     tags:
 *       - Resources
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resource retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resource_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 role:
 *                   type: string
 *                 skills:
 *                   type: string
 *                 rate:
 *                   type: number
 *                   format: float
 *                 availability_status:
 *                   type: string
 *                 department:
 *                   type: string
 *                 contact_info:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ resource_id: string }> }
) {
  const resolvedParams = await context.params;
  const { resource_id } = resolvedParams;
  try {
    const resource = await prisma.resource.findUnique({
      where: { resource_id: Number(resource_id) },
      include: {
        assignments: {
          include: {
            task: {
              include: {
                wbs: {
                  include: {
                    project: {
                      select: {
                        project_id: true,
                        name: true,
                        status: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Calculate derived fields
    const activeAssignments = resource.assignments.filter(a => a.task.status === 'in_progress');
    const totalPlannedHours = resource.assignments.reduce((sum, a) => sum + a.planned_hours, 0);
    const totalActualHours = resource.assignments.reduce((sum, a) => sum + a.actual_hours, 0);
    const utilization = resource.capacity > 0 ? (totalActualHours / (resource.capacity * 4)) * 100 : 0; // Monthly utilization

    // Parse skills if it's a JSON string
    let parsedSkills = resource.skills;
    if (typeof resource.skills === 'string') {
      try {
        parsedSkills = JSON.parse(resource.skills);
      } catch (e) {
        parsedSkills = { Skills: [], Languages: [] };
      }
    }

    const responseData = {
      ...resource,
      skills: parsedSkills,
      active_assignments_count: activeAssignments.length,
      total_assignments_count: resource.assignments.length,
      total_planned_hours: totalPlannedHours,
      total_actual_hours: totalActualHours,
      current_utilization: Math.round(utilization * 100) / 100,
      current_projects: [...new Set(resource.assignments.map(a => a.task.wbs.project.project_id))].length,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch resource" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/resources/{resource_id}:
 *   put:
 *     summary: Update a resource
 *     description: Updates an existing resource by ID
 *     tags:
 *       - Resources
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the resource
 *               type:
 *                 type: string
 *                 description: Type of resource (e.g., Human, Equipment, Material)
 *               role:
 *                 type: string
 *                 description: Role or position of the resource
 *               skills:
 *                 type: string
 *                 description: Skills or capabilities of the resource
 *               rate:
 *                 type: number
 *                 format: float
 *                 description: Hourly or daily rate for the resource
 *               availability_status:
 *                 type: string
 *                 description: Current availability status
 *               department:
 *                 type: string
 *                 description: Department the resource belongs to
 *               contact_info:
 *                 type: string
 *                 description: Contact information for the resource
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resource_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *       400:
 *         description: Failed to update resource
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ resource_id: string }> }
) {
  const resolvedParams = await context.params;
  const { resource_id } = resolvedParams;
  try {
    const data = await req.json();
    const resourceIdNum = Number(resource_id);

    // Check for duplicate name (excluding current resource)
    const existingByName = await prisma.resource.findFirst({
      where: {
        name: data.name.trim(),
        resource_id: { not: resourceIdNum },
      },
    });

    if (existingByName) {
      return NextResponse.json({ 
        error: `A resource with the name "${data.name.trim()}" already exists. Please choose a different name.`,
        duplicateField: "name",
        existingResourceId: existingByName.resource_id
      }, { status: 409 }); // 409 Conflict
    }

    // For labor resources, check for duplicate email and phone number (excluding current resource)
    if (data.type === 'labor') {
      if (data.email) {
        const existingByEmail = await prisma.resource.findFirst({
          where: {
            email: data.email.trim(),
            type: 'labor',
            resource_id: { not: resourceIdNum },
          },
        });

        if (existingByEmail) {
          return NextResponse.json({ 
            error: `A resource with the email "${data.email.trim()}" already exists. Please use a different email address.`,
            duplicateField: "email",
            existingResourceId: existingByEmail.resource_id
          }, { status: 409 }); // 409 Conflict
        }
      }

      if (data.phone_number) {
        // Normalize phone number (remove spaces, dashes, parentheses for comparison)
        const normalizedPhone = data.phone_number.replace(/[\s\-\(\)\+]/g, '');
        const allResources = await prisma.resource.findMany({
          where: {
            type: 'labor',
            phone_number: { not: null },
            resource_id: { not: resourceIdNum },
          },
        });

        // Check if any existing phone number matches when normalized
        const existingByPhone = allResources.find(resource => {
          if (!resource.phone_number) return false;
          const existingNormalized = resource.phone_number.replace(/[\s\-\(\)\+]/g, '');
          return existingNormalized === normalizedPhone;
        });

        if (existingByPhone) {
          return NextResponse.json({ 
            error: `A resource with the phone number "${data.phone_number}" already exists. Please use a different phone number.`,
            duplicateField: "phone_number",
            existingResourceId: existingByPhone.resource_id
          }, { status: 409 }); // 409 Conflict
        }
      }
    }

    const updated = await prisma.resource.update({
      where: { resource_id: Number(resource_id) },
      data: {
        name: data.name,
        type: data.type,
        role: data.role,
        capacity: data.capacity,
        rating: data.rating,
        skills: data.skills,
        rate: parseFloat(data.rate),
        availability_status: data.availability_status,
        department: data.department,
        phone_number: data.phone_number || null,
        email: data.email || null,
        location: data.location || null,
        unit: data.unit || null,
        quantity: data.quantity != null ? parseFloat(data.quantity) : null,
        // updated_at is automatically handled by Prisma @updatedAt
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 400 }
    );
  }
}

/**
 * @swagger
 * /api/resources/{resource_id}:
 *   delete:
 *     summary: Delete a resource
 *     description: Deletes a resource by ID
 *     tags:
 *       - Resources
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resource deleted successfully
 *                 deleted:
 *                   type: object
 *       400:
 *         description: Failed to delete resource or missing resource ID
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ resource_id: string }> }
) {
  const resolvedParams = await context.params;
  const { resource_id } = resolvedParams;
  
  try {
    // Check authentication using auth-helpers
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!resource_id) {
      return NextResponse.json({ error: "Resource ID is missing" }, { status: 400 });
    }

    // Check if resource exists before deletion
    const existingResource = await prisma.resource.findUnique({
      where: { resource_id: Number(resource_id) },
    });

    if (!existingResource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Perform cascading delete using transactions
    const result = await prisma.$transaction(async (tx) => {
      // Delete field data before resource assignments
      await tx.fieldData.deleteMany({
        where: { 
          resource_assignment: {
            resource_id: Number(resource_id)
          }
        }
      });

      // Delete resource assignments
      await tx.resourceAssignment.deleteMany({
        where: { resource_id: Number(resource_id) }
      });

      // Delete maintenance logs
      await tx.maintenanceLog.deleteMany({
        where: { resource_id: Number(resource_id) }
      });

      // Delete maintenance schedules
      await tx.maintenanceSchedule.deleteMany({
        where: { resource_id: Number(resource_id) }
      });

      // Delete equipment site logs
      await tx.equipmentSiteLog.deleteMany({
        where: { resource_id: Number(resource_id) }
      });

      // Finally, delete the resource itself
      const deletedResource = await tx.resource.delete({
        where: { resource_id: Number(resource_id) },
      });

      return deletedResource;
    });

    return NextResponse.json({ 
      message: "Resource and all related records deleted successfully", 
      deleted: result 
    });

  } catch (error) {
    console.error("Error deleting resource:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('User ID not found')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes('Resource not found')) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
