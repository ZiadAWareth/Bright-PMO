import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/projects/finance/{projectCode}:
 *   get:
 *     summary: Get a single project by project code for finance system
 *     description: Returns project data in finance system format for a specific project
 *     tags:
 *       - Projects
 *       - Finance
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         description: API key for external system authentication
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique project code
 *         example: "PROJ-2026-001"
 *     responses:
 *       200:
 *         description: Project data successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   type: object
 *                   properties:
 *                     companyId:
 *                       type: string
 *                       example: "cml9q30vb0001ui0w0l6ffrc2"
 *                     projectCode:
 *                       type: string
 *                       example: "PROJ-2026-001"
 *                     projectName:
 *                       type: string
 *                       example: "New Construction Project"
 *                     externalSystemId:
 *                       type: string
 *                       example: "PM_123"
 *                     description:
 *                       type: string
 *                       example: "Project description"
 *                     status:
 *                       type: string
 *                       enum: [PLANNING, EXECUTION, COMPLETED, ON_HOLD]
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     totalBudget:
 *                       type: number
 *                       example: 1000000.00
 *                     actualSpent:
 *                       type: number
 *                       example: 150000.00
 *                     projectManager:
 *                       type: string
 *                       example: "John Doe"
 *                     department:
 *                       type: string
 *                       example: "Engineering"
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 source:
 *                   type: string
 *                   example: "PM_SYSTEM"
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error
 */
function mapToFinanceStatus(status: string): 'PLANNING' | 'EXECUTION' | 'COMPLETED' | 'ON_HOLD' {
  const statusMap: Record<string, 'PLANNING' | 'EXECUTION' | 'COMPLETED' | 'ON_HOLD'> = {
    'planning': 'PLANNING',
    'pending_approval': 'PLANNING',
    'approved': 'PLANNING',
    'execution': 'EXECUTION',
    'in_progress': 'EXECUTION',
    'completed': 'COMPLETED',
    'closed': 'COMPLETED',
    'on_hold': 'ON_HOLD',
    'suspended': 'ON_HOLD',
    'rejected': 'ON_HOLD'
  };
  
  return statusMap[status] || 'PLANNING';
}

export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ projectCode: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { projectCode } = resolvedParams;

    if (!projectCode) {
      return NextResponse.json({ 
        error: 'Project code is required' 
      }, { status: 400 });
    }

    // Find project by project code
    const project = await prisma.project.findFirst({
      where: { 
        project_code: projectCode 
      },
      select: {
        project_id: true,
        project_code: true,
        name: true,
        description: true,
        status: true,
        start_date: true,
        planned_end_date: true,
        budget_amount: true,
        allocated_cost: true, // This was missing from select
        actual_cost: true,
        location: true,
        archived: true,
        created_at: true,
        updated_at: true,
        manager: { // This was missing from select
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found',
        projectCode 
      }, { status: 404 });
    }

    // Format project data for finance system
    const formattedProject = {
      companyId: "cml9q30vb0001ui0w0l6ffrc2",
      projectCode: project.project_code,
      projectName: project.name,
      externalSystemId: `PM_${project.project_id}`,
      description: project.description,
      status: mapToFinanceStatus(project.status),
      startDate: project.start_date?.toISOString(),
      endDate: project.planned_end_date?.toISOString(),
      totalBudget: project.budget_amount,
      allocatedBudget: project.allocated_cost, // Use allocated_cost field
      actualSpent: project.actual_cost,
      projectManager: project.manager?.account 
        ? `${project.manager.account.first_name} ${project.manager.account.last_name}`.trim()
        : undefined,
      department: project.location || 'General',
      isActive: !project.archived,
      createdAt: project.created_at.toISOString(),
      updatedAt: project.updated_at.toISOString()
    };

    return NextResponse.json({
      project: formattedProject,
      timestamp: new Date().toISOString(),
      source: "PM_SYSTEM"
    });

  } catch (error) {
    console.error('Finance API Single Project Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}