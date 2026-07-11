import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/procurements:
 *   get:
 *     summary: Get all procurements
 *     description: Retrieves a list of all procurements with related data
 *     tags:
 *       - Procurements
 *     responses:
 *       200:
 *         description: List of procurements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   procurement_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                     enum: [material, service, equipment]
 *                   description:
 *                     type: string
 *                   estimated_cost:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *                   wbs:
 *                     type: object
 *                   contracts:
 *                     type: array
 *                     items:
 *                       type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const procurements = await prisma.procurement.findMany({
      include: {
        project: true,
        wbs: true,
        contracts: true
      }
    });
    return NextResponse.json(procurements);
  } catch (error) {
    console.error('Error fetching procurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procurements' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/procurements:
 *   post:
 *     summary: Create a new procurement
 *     description: Creates a new procurement and automatically generates an associated contract
 *     tags:
 *       - Procurements
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - type
 *               - status
 *               - estimated_cost
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this procurement belongs to
 *               wbs_id:
 *                 type: integer
 *                 description: Optional ID of the WBS this procurement belongs to
 *               type:
 *                 type: string
 *                 enum: [material, service, equipment]
 *                 description: Type of procurement
 *               description:
 *                 type: string
 *                 description: Description of what is being procured
 *               estimated_cost:
 *                 type: number
 *                 format: float
 *                 description: Estimated cost of the procurement
 *               actual_cost:
 *                 type: number
 *                 format: float
 *                 description: Actual cost of the procurement
 *               status:
 *                 type: string
 *                 description: Current status of the procurement
 *               vendor_id:
 *                 type: integer
 *                 description: ID of the vendor for the auto-generated contract
 *     responses:
 *       201:
 *         description: Procurement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 procurement_id:
 *                   type: integer
 *                 type:
 *                   type: string
 *                 estimated_cost:
 *                   type: number
 *                   format: float
 *       400:
 *         description: Missing required fields or invalid type
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const { userId } = await getUserFromHeaders();
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['project_id', 'type', 'status', 'estimated_cost'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate procurement type
    const validTypes = ['material', 'service', 'equipment'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid procurement type. Must be one of: material, service, equipment' },
        { status: 400 }
      );
    }

    // Create the procurement
    const procurementData: any = {
      project: {
        connect: { project_id: body.project_id }
      },
      type: body.type,
      description: body.description,
      estimated_cost: body.estimated_cost,
      actual_cost: body.actual_cost || 0,
      status: body.status
    };

    // Only connect to WBS if wbs_id is provided
    if (body.wbs_id) {
      procurementData.wbs = {
        connect: { wbs_id: body.wbs_id }
      };
    }

    const procurement = await prisma.procurement.create({
      data: procurementData,
      include: {
        project: true,
        wbs: true,
        contracts: true
      }
    });

   
    // Notify project procurement team of new RFQ (procurement)
    const projectInfo = await prisma.project.findUnique({
      where: { project_id: body.project_id },
      include: { manager: true, team_members: { select: { user_id: true } } }
    });
    if (projectInfo) {
      const recipients = Array.from(new Set([
        projectInfo.manager_id,
        ...projectInfo.team_members.map(tm => tm.user_id)
      ]));
      await Promise.all(recipients.map(uid =>
        prisma.notification.create({
          data: {
            user_id: uid,
            type: 'SYSTEM_ALERT',
            title: 'New RFQ Created',
            message: `A new procurement request (#${procurement.procurement_id}) was created for your project`,
            priority: 'MEDIUM',
            created_by_id: userId,
            metadata: { project_id: body.project_id, procurement_id: procurement.procurement_id }
          }
        })
      ));
    }

    return NextResponse.json(procurement, { status: 201 });
  } catch (error) {
    console.error('Error creating procurement:', error);
    return NextResponse.json(
      { error: 'Failed to create procurement' },
      { status: 500 }
    );
  }
}
