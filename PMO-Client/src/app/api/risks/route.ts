import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import type { NotificationType, NotificationPriority, NotificationStatus, ImpactLevel, ProbabilityLevel, RiskLevel } from '@prisma/client';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ActivityLogger } from '@/lib/activity-logger';

/**
 * @swagger
 * /api/risks:
 *   get:
 *     summary: Get all risks with advanced filtering
 *     description: Retrieves a list of all risks with their mitigations and notifications, with support for advanced filtering
 *     tags:
 *       - Risks
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for risk name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by risk category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by risk status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by risk priority
 *       - in: query
 *         name: impact
 *         schema:
 *           type: string
 *         description: Filter by impact level
 *       - in: query
 *         name: probability
 *         schema:
 *           type: string
 *         description: Filter by probability level
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filter by project ID
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: integer
 *         description: Filter by risk owner
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field (name, score, created_at, priority, status)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: Sort order (asc, desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: A list of risks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 risks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       risk_id:
 *                         type: integer
 *                       project_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       identified_date:
 *                         type: string
 *                         format: date-time
 *                       impact:
 *                         type: string
 *                       probability:
 *                         type: string
 *                       riskLevel:
 *                         type: string
 *                       status:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       owner_id:
 *                         type: integer
 *                       score:
 *                         type: number
 *                       last_reviewed:
 *                         type: string
 *                         format: date-time
 *                       next_review:
 *                         type: string
 *                         format: date-time
 *                       mitigations:
 *                         type: array
 *                         items:
 *                           type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const impact = searchParams.get('impact') || '';
    const probability = searchParams.get('probability') || '';
    const projectId = searchParams.get('project_id') || '';
    const ownerId = searchParams.get('owner_id') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (impact) {
      where.impact = impact;
    }

    if (probability) {
      where.probability = probability;
    }

    if (projectId) {
      where.project_id = parseInt(projectId);
    }

    if (ownerId) {
      where.owner_id = parseInt(ownerId);
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count for pagination
    const total = await prisma.risk.count({ where });

    // Get risks with pagination
    const risks = await prisma.risk.findMany({
      where,
      include: {
        project: true,
        owner: true,
        mitigations: true
      },
      orderBy,
      take: limit,
      skip: offset
    });

    return NextResponse.json({
      risks,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching risks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risks' },
      { status: 500 }
    );
  }
}

//export async function POST(request: Request) {
  // try {
  //   const body = await request.json();
    
  //   // Validate required fields
  //   const requiredFields = ['project_id', 'name', 'identified_date', 'impact', 'probability', 'status', 'owner_id'];
  //   const missingFields = requiredFields.filter(field => !body[field]);
    
  //   if (missingFields.length > 0) {
  //     return NextResponse.json(
  //       { error: `Missing required fields: ${missingFields.join(', ')}` },
  //       { status: 400 }
  //     );
  //   }

  //   // Create the risk
  //   const risk = await prisma.risk.create({
  //     data: {
  //       project_id: body.project_id,
  //       name: body.name,
  //       description: body.description,
  //       identified_date: new Date(body.identified_date),
  //       impact: body.impact,
  //       probability: body.probability,
  //       status: body.status,
  //       owner_id: body.owner_id
  //     },
  //     include: {
  //       project: true,
  //       owner: true,
  //       mitigations: true
  //     }
  //   });

  //   return NextResponse.json(risk, { status: 201 });
  // } catch (error) {
  //   console.error('Error creating risk:', error);
  //   return NextResponse.json(
  //     { error: 'Failed to create risk' },
  //     { status: 500 }
  //   );
  // }
//}

/**
 * @swagger
 * /api/risks:
 *   post:
 *     summary: Create a new risk
 *     description: Creates a new risk with auto-generated mitigation plan and notifications
 *     tags:
 *       - Risks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - name
 *               - impact
 *               - probability
 *               - owner_id
 *               - category
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this risk belongs to
 *               name:
 *                 type: string
 *                 description: Risk name/title
 *               description:
 *                 type: string
 *                 description: Detailed description of the risk
 *               category:
 *                 type: string
 *                 description: Risk category (Financial, Technical, Operational, etc.)
 *               impact:
 *                 type: string
 *                 enum: [high, medium, low]
 *                 description: Impact level if the risk occurs
 *               probability:
 *                 type: string
 *                 enum: [high, medium, low]
 *                 description: Probability of the risk occurring
 *               owner_id:
 *                 type: integer
 *                 description: ID of the user responsible for the risk
 *     responses:
 *       200:
 *         description: Risk created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 risk:
 *                   type: object
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const { userId, role } = await getUserFromHeaders();

    // Check if user role is allowed to create risks
    // QAQC can view risks but cannot create them
    if (role === "QAQC") {
      return NextResponse.json(
        { error: "QAQC role can view risks but is not authorized to create risks" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Fetch project to validate date range and approval status
    const project = await prisma.project.findUnique({
      where: { project_id: body.project_id },
      select: {
        start_date: true,
        planned_end_date: true,
        name: true,
        manager_id: true,
        status: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Validate risk identified date is within project date range
    const identifiedDate = body.identified_date ? new Date(body.identified_date) : new Date();
    const projectStartDate = new Date(project.start_date);
    const projectEndDate = project.planned_end_date ? new Date(project.planned_end_date) : new Date();

    if (identifiedDate < projectStartDate || identifiedDate > projectEndDate) {
      return NextResponse.json(
        {
          error: "Risk identified date must be within the project's start and end dates",
          projectStartDate: project.start_date,
          projectEndDate: project.planned_end_date
        },
        { status: 400 }
      );
    }

    // Map impact and probability to numbers
    function getScoreValue(val: string) {
      if (val === 'high') return 3;
      if (val === 'medium') return 2;
      return 1;
    }
    const normalizedImpact = body.impact.toLowerCase();
    const normalizedProbability = body.probability.toLowerCase();
    const impactValue = getScoreValue(normalizedImpact);
    const probabilityValue = getScoreValue(normalizedProbability);
    const calculatedRiskScore = impactValue * probabilityValue;

    // Risk level based on the risk score
    let riskLevel: RiskLevel;
    if (calculatedRiskScore <= 3) {
      riskLevel = 'low';
    } else if (calculatedRiskScore <= 6) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Create a new risk
    const newRisk = await prisma.risk.create({
      data: {
        project: {
          connect: {
            project_id: body.project_id
          }
        },
        owner: {
          connect: {
            user_id: userId
          }
        },
        name: body.name,
        description: body.description,
        category: body.category,
        impact: normalizedImpact,
        probability: normalizedProbability,
        riskScore: calculatedRiskScore,
        riskLevel: riskLevel,
        status: 'identified',
        approvalStatus: 'Pending',
        currentStatus: 'Open',
        identified_date: identifiedDate,
      },
    });

    // Log the activity (recent activity)
    await ActivityLogger.logRiskActivity(
      userId,
      'create',
      newRisk.risk_id,
      newRisk.name,
      project.name,
      `Created new risk: ${newRisk.name}`,
      {
        project_id: body.project_id,
        project_name: project.name,
        additional_info: {
          risk_id: newRisk.risk_id,
          risk_name: newRisk.name,
          impact: newRisk.impact,
          probability: newRisk.probability,
          riskScore: newRisk.riskScore,
          riskLevel: newRisk.riskLevel
        }
      }
    );

    // Notify project manager and risk owner only when project is fully approved
    const projectFullyApproved =
      project.status === "execution" || project.status === "completed";
    if (projectFullyApproved) {
      await Promise.all([
        prisma.notification.create({
          data: {
            user_id: project.manager_id,
            type: "RISK_ALERT",
            title: "New Risk Created",
            message: `A new risk "${newRisk.name}" has been created`,
            priority: "HIGH",
            created_by_id: 1,
            metadata: { risk_id: newRisk.risk_id, project_id: body.project_id }
          }
        }),
        prisma.notification.create({
          data: {
            user_id: newRisk.owner_id,
            type: "RISK_ALERT",
            title: "Risk Ownership Assigned",
            message: `You are owner of risk "${newRisk.name}"`,
            priority: "MEDIUM",
            created_by_id: 1,
            metadata: { risk_id: newRisk.risk_id, project_id: body.project_id }
          }
        })
      ]);
    }

    return NextResponse.json({ message: 'Risk logged successfully', risk: newRisk });
  } catch (error) {
    console.error('Error logging risk:', error);
    return NextResponse.json({ error: 'Failed to log risk' }, { status: 500 });
  }
}