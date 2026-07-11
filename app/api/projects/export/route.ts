import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/projects/export:
 *   get:
 *     summary: Export projects data for PDF generation
 *     description: Retrieve all projects data in a format suitable for PDF export
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of project IDs to export (optional, exports all if not provided)
 *     responses:
 *       200:
 *         description: Projects data for export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                 export_metadata:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  try {
    // Get user from headers for authentication
    const user = await getUserFromHeaders();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectIdsParam = searchParams.get('project_ids');
    
    // Build where clause
    const whereClause: any = {
      archived: false // Only export non-archived projects
    };

    // If specific project IDs are provided, filter by them
    if (projectIdsParam) {
      const projectIds = projectIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (projectIds.length > 0) {
        whereClause.project_id = {
          in: projectIds
        };
      }
    }

    // Fetch projects with basic data for export
    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        },
        team_members: {
          select: {
            user: {
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
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data for better export formatting
    const exportData = projects.map(project => ({
      // Basic project info
      project_id: project.project_id,
      project_code: project.project_code,
      name: project.name,
      description: project.description || 'N/A',
      status: project.status,
      priority: project.priority,
      
      // Dates
      start_date: project.start_date.toISOString().split('T')[0],
      planned_end_date: project.planned_end_date ? project.planned_end_date.toISOString().split('T')[0] : 'N/A',
      actual_end_date: project.actual_end_date ? project.actual_end_date.toISOString().split('T')[0] : 'N/A',
      
      // Financial
      budget_amount: project.budget_amount || 0,
      actual_cost: project.actual_cost || 0,
      budget_variance: (project.budget_amount || 0) - (project.actual_cost || 0),
      
      // Progress
      progress_percentage: project.progress_percentage || 0,
      
      // Project Manager
      project_manager: project.creator?.account ? 
        `${project.creator.account.first_name} ${project.creator.account.last_name}` : 'N/A',
      
      // Team
      team_size: project.team_members?.length || 0,
      
      // Additional fields
      location: project.location || 'N/A',
      client: project.client || 'N/A',
      contractor: project.contractor || 'N/A',
      strategic_value: project.strategicValue || 'N/A',
      compliance: project.compliance || 'N/A',
      roi: project.roi || 0,
      size: project.size || 'N/A',
      type: project.type || 'N/A',
      
      // Timestamps
      created_at: project.created_at.toISOString().split('T')[0],
      updated_at: project.updated_at.toISOString().split('T')[0]
    }));

    // Get user details for export metadata
    const userDetails = await prisma.user.findUnique({
      where: { user_id: user.userId },
      select: {
        account: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });

    // Export metadata
    const exportMetadata = {
      export_date: new Date().toISOString(),
      total_projects: exportData.length,
      exported_by: userDetails?.account ? 
        `${userDetails.account.first_name} ${userDetails.account.last_name}` : 'Unknown User',
      export_filters: projectIdsParam ? { project_ids: projectIdsParam } : { all_projects: true },
      summary: {
        total_budget: exportData.reduce((sum, p) => sum + (p.budget_amount || 0), 0),
        total_actual_cost: exportData.reduce((sum, p) => sum + (p.actual_cost || 0), 0),
        average_progress: exportData.length > 0 ? 
          exportData.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / exportData.length : 0,
        status_breakdown: exportData.reduce((acc: any, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        priority_breakdown: exportData.reduce((acc: any, p) => {
          acc[p.priority] = (acc[p.priority] || 0) + 1;
          return acc;
        }, {})
      }
    };

    return NextResponse.json({
      projects: exportData,
      export_metadata: exportMetadata
    });

  } catch (error) {
    console.error('Error exporting projects:', error);
    return NextResponse.json(
      { error: 'Failed to export projects data' },
      { status: 500 }
    );
  }
} 