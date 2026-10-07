// app/api/resources/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get all resources
 *     description: Retrieves a list of all resources, optionally filtered by availability status
 *     tags:
 *       - Resources
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, busy, on_leave, inactive]
 *         description: Filter resources by availability status
 *     responses:
 *       200:
 *         description: List of resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   resource_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   role:
 *                     type: string
 *                   skills:
 *                     type: string
 *                   rate:
 *                     type: number
 *                     format: float
 *                   availability_status:
 *                     type: string
 *                     enum: [available, busy, on_leave, inactive]
 *                   department:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone_number:
 *                     type: string
 *                   location:
 *                     type: string
 *                   unit:
 *                     type: string
 *                     description: Unit of measurement for material resources (e.g., 'kg', 'ltr')
 *                   quantity:
 *                     type: number
 *                     format: float
 *                     description: Current stock quantity
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
export async function GET() {
    try {
        const allResources = await prisma.resource.findMany({
            include: {
                assignments: {
                    include: {
                        task: {
                            include: {
                                wbs: {
                                    include: {
                                        project: {
                                            select: {
                                                name: true
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

        // Get available resources (for backward compatibility)
        const availableResources = await prisma.resource.findMany({
            where: {
                availability_status: 'available'
            }
        });

        return NextResponse.json({
            allResources,
            availableResources,
            totalCount: allResources.length,
            availableCount: availableResources.length
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        return NextResponse.json(
            { error: 'Failed to fetch resources' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/resources:
 *   post:
 *     summary: Create a new resource
 *     description: Creates a new resource with the provided details
 *     tags:
 *       - Resources
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - role
 *               - skills
 *               - rate
 *               - availability_status
 *               - department
 *               - updated_at
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
 *               email:
 *                 type: string
 *                 description: Email address of the resource
 *               phone_number:
 *                 type: string
 *                 description: Phone number of the resource
 *               location:
 *                 type: string
 *                 description: Location of the resource
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *                 description: Last updated timestamp (required field)
 *               unit:
 *                 type: string
 *                 description: Unit of measurement for material resources (e.g., 'kg', 'ltr')
 *               quantity:
 *                 type: number
 *                 format: float
 *                 description: Initial stock quantity for material resources
 *     responses:
 *       201:
 *         description: Resource created successfully
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
 *         description: Failed to create resource
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'role', 'skills', 'rate', 'availability_status', 'department', 'updated_at'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    // For material resources, unit and quantity are required
    if (data.type === 'material') {
      if (!data.unit) missingFields.push('unit');
      if (data.quantity == null) missingFields.push('quantity');
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: "Missing required fields", 
        missingFields: missingFields 
      }, { status: 400 });
    }

    // Check for duplicate name (name must be unique)
    const existingByName = await prisma.resource.findFirst({
      where: {
        name: data.name.trim(),
      },
    });

    if (existingByName) {
      return NextResponse.json({ 
        error: `A resource with the name "${data.name.trim()}" already exists. Please choose a different name.`,
        duplicateField: "name",
        existingResourceId: existingByName.resource_id
      }, { status: 409 }); // 409 Conflict
    }

    // For labor resources, check for duplicate email and phone number
    if (data.type === 'labor') {
      if (data.email) {
        const existingByEmail = await prisma.resource.findFirst({
          where: {
            email: data.email.trim(),
            type: 'labor',
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

    // Process skills data
    let skillsData;
    try {
      if (typeof data.skills === 'string') {
        skillsData = JSON.parse(data.skills);
      } else {
        skillsData = data.skills;
      }
    } catch (error) {
      console.error("Skills parsing error:", error);
      return NextResponse.json({ 
        error: "Invalid skills format. Must be valid JSON." 
      }, { status: 400 });
    }

    const newResource = await prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        role: data.role,
        skills: skillsData,
        rate: parseFloat(data.rate),
        capacity: data.capacity ? parseInt(data.capacity) : 40,
        availability_status: data.availability_status,
        department: data.department,
        email: data.email || null,
        phone_number: data.phone_number || null,
        location: data.location || null,
        unit: data.unit || null,
        quantity: data.quantity != null ? parseFloat(data.quantity) : null,
        updated_at: new Date(data.updated_at),
      } as any,
    });
    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ 
      error: "Failed to create resource", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 400 });
  }
}
