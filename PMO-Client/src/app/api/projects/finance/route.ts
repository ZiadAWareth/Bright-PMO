import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/projects/finance:
 *   get:
 *     summary: Get projects with finance-relevant fields only
 *     description: Retrieve a streamlined list of projects with only the fields needed by the finance system for better performance
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
 *       - in: query
 *         name: include_archived
 *         schema:
 *           type: boolean
 *         description: Include archived projects in the results
 *       - in: query
 *         name: archived_only
 *         schema:
 *           type: boolean
 *         description: Return only archived projects
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by project status (e.g., 'approved', 'execution')
 *     responses:
 *       200:
 *         description: A streamlined list of projects with finance-relevant fields
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   companyId:
 *                     type: string
 *                     description: Hardcoded company identifier
 *                   project_code:
 *                     type: string
 *                     description: Unique project code
 *                   name:
 *                     type: string
 *                     description: Project name
 *                   externalSystemId:
 *                     type: string
 *                     description: Hardcoded external system ID (PM_<project_id>)
 *                   description:
 *                     type: string
 *                     description: Project description
 *                   status:
 *                     type: string
 *                     description: Current project status
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     description: Project start date
 *                   planned_end_date:
 *                     type: string
 *                     format: date
 *                     description: Planned end date
 *                   budget_amount:
 *                     type: number
 *                     format: float
 *                     description: Total planned budget amount
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                     description: Actual spent amount
 *                   location:
 *                     type: string
 *                     description: Project location (used as department)
 *                   archived:
 *                     type: boolean
 *                     description: Whether project is archived (isActive = !archived)
 *                   manager:
 *                     type: object
 *                     description: Project manager details
 *                     properties:
 *                       account:
 *                         type: object
 *                         properties:
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update project budget data from finance system
 *     description: Allow finance system to update project budget and actual cost information
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectCode
 *             properties:
 *               projectCode:
 *                 type: string
 *                 description: Unique project code to identify the project
 *               totalBudget:
 *                 type: number
 *                 format: float
 *                 description: Updated total budget amount
 *               allocatedBudget:
 *                 type: number
 *                 format: float
 *                 description: Updated allocated budget amount
 *               actualSpent:
 *                 type: number
 *                 format: float
 *                 description: Updated actual spent amount
 *               status:
 *                 type: string
 *                 enum: ['PLANNING', 'EXECUTION', 'COMPLETED', 'ON_HOLD']
 *                 description: Updated project status from finance system
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 project:
 *                   type: object
 *                   properties:
 *                     projectCode:
 *                       type: string
 *                     totalBudget:
 *                       type: number
 *                     allocatedBudget:
 *                       type: number
 *                     actualSpent:
 *                       type: number
 *                     status:
 *                       type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const includeArchived = searchParams.get('include_archived') === 'true';
        const archivedOnly = searchParams.get('archived_only') === 'true';
        const statusFilter = searchParams.get('status');

        // Build where clause based on query parameters
        let whereClause: any = {};
        
        if (archivedOnly) {
            whereClause.archived = true;
        } else if (!includeArchived) {
            whereClause.archived = false;
        }

        // Add status filter if provided
        if (statusFilter) {
            whereClause.status = statusFilter;
        }

        // Query projects with only finance-relevant fields
        const projects = await prisma.project.findMany({
            where: whereClause,
            select: {
                project_id: true,
                project_code: true,
                name: true,
                description: true,
                status: true,
                start_date: true,
                planned_end_date: true,
                budget_amount: true,
                allocated_cost: true, // Use allocated_cost (matches your schema)
                actual_cost: true,
                location: true,
                archived: true,
                manager: {
                    select: {
                        account: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Transform the data to match finance system expectations
        const financeProjects = projects.map(project => ({
            companyId: "cml9q30vb0001ui0w0l6ffrc2", // Hardcoded company ID
            projectCode: project.project_code,
            projectName: project.name,
            externalSystemId: `PM_${project.project_id}`, // Hardcoded external system ID using project ID
            description: project.description || '',
            status: mapProjectStatusToFinance(project.status),
            startDate: project.start_date?.toISOString(),
            endDate: project.planned_end_date?.toISOString(),
            totalBudget: project.budget_amount, // This is the planned budget
            allocatedBudget: project.allocated_cost, // Use allocated_cost field
            actualSpent: project.actual_cost,   // This is the actual spent amount
            projectManager: project.manager?.account 
                ? `${project.manager.account.first_name} ${project.manager.account.last_name}`.trim()
                : null,
            department: project.location || 'General',
            isActive: !project.archived
        }));

        return NextResponse.json({
            projects: financeProjects,
            count: financeProjects.length,
            timestamp: new Date().toISOString(),
            source: 'PM_SYSTEM'
        });

    } catch (error) {
        console.error('Error fetching finance projects:', error);
        
        return NextResponse.json(
            { error: 'Failed to fetch projects for finance system' },
            { status: 500 }
        );
    }
}

// Helper function to map project status to finance system format
function mapProjectStatusToFinance(status: string): 'PLANNING' | 'EXECUTION' | 'COMPLETED' | 'ON_HOLD' {
    const statusMap: Record<string, 'PLANNING' | 'EXECUTION' | 'COMPLETED' | 'ON_HOLD'> = {
        'planning': 'PLANNING',
        'pending_approval': 'PLANNING',
        'approved': 'PLANNING',
        'execution': 'EXECUTION',
        'completed': 'COMPLETED',
        'closed': 'COMPLETED',
        'on_hold': 'ON_HOLD',
        'rejected': 'ON_HOLD'
    };
    
    return statusMap[status] || 'PLANNING';
}

// Helper function to map finance system status to internal status
function mapFinanceStatusToInternal(status: string): string | null {
    const statusMap: Record<string, string> = {
        'PLANNING': 'planning',
        'EXECUTION': 'execution',
        'COMPLETED': 'completed',
        'ON_HOLD': 'on_hold'
    };
    
    return statusMap[status] || null;
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { projectCode, totalBudget, allocatedBudget, actualSpent, status } = body;

        // Validate required fields
        if (!projectCode) {
            return NextResponse.json(
                { error: 'projectCode is required' },
                { status: 400 }
            );
        }

        // Find the project by project code
        const existingProject = await prisma.project.findUnique({
            where: { project_code: projectCode },
            select: {
                project_id: true,
                project_code: true,
                budget_amount: true,
                allocated_cost: true, // Use allocated_cost (matches your schema)
                actual_cost: true,
                status: true,
                name: true
            }
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: any = {
            updated_at: new Date()
        };

        // Update budget if provided
        if (totalBudget !== undefined && totalBudget !== null) {
            if (typeof totalBudget !== 'number' || totalBudget < 0) {
                return NextResponse.json(
                    { error: 'totalBudget must be a positive number' },
                    { status: 400 }
                );
            }
            updateData.budget_amount = totalBudget;
        }

        // Update allocated budget if provided
        if (allocatedBudget !== undefined && allocatedBudget !== null) {
            if (typeof allocatedBudget !== 'number' || allocatedBudget < 0) {
                return NextResponse.json(
                    { error: 'allocatedBudget must be a positive number' },
                    { status: 400 }
                );
            }
            updateData.allocated_cost = allocatedBudget; // Use allocated_cost field
        }

        // Update actual cost if provided
        if (actualSpent !== undefined && actualSpent !== null) {
            if (typeof actualSpent !== 'number' || actualSpent < 0) {
                return NextResponse.json(
                    { error: 'actualSpent must be a positive number' },
                    { status: 400 }
                );
            }
            updateData.actual_cost = actualSpent;
        }

        // Update status if provided (map from finance format to internal format)
        if (status) {
            const internalStatus = mapFinanceStatusToInternal(status);
            if (!internalStatus) {
                return NextResponse.json(
                    { error: 'Invalid status. Must be one of: PLANNING, EXECUTION, COMPLETED, ON_HOLD' },
                    { status: 400 }
                );
            }
            updateData.status = internalStatus;
        }

        // Perform the update
        const updatedProject = await prisma.project.update({
            where: { project_code: projectCode },
            data: updateData,
            select: {
                project_id: true,
                project_code: true,
                name: true,
                budget_amount: true,
                allocated_cost: true, // Use allocated_cost field
                actual_cost: true,
                status: true,
                updated_at: true
            }
        });

        // Log the update
        console.log(`Finance system updated project ${projectCode}:`, {
            previousBudget: existingProject.budget_amount,
            newBudget: updatedProject.budget_amount,
            previousAllocated: existingProject.allocated_cost,
            newAllocated: updatedProject.allocated_cost,
            previousActual: existingProject.actual_cost,
            newActual: updatedProject.actual_cost,
            previousStatus: existingProject.status,
            newStatus: updatedProject.status
        });

        return NextResponse.json({
            message: 'Project updated successfully',
            project: {
                projectCode: updatedProject.project_code,
                projectName: updatedProject.name,
                totalBudget: updatedProject.budget_amount,
                allocatedBudget: updatedProject.allocated_cost, // Use allocated_cost field
                actualSpent: updatedProject.actual_cost,
                status: mapProjectStatusToFinance(updatedProject.status),
                externalSystemId: `PM_${updatedProject.project_id}`
            },
            updatedAt: updatedProject.updated_at.toISOString(),
            source: 'FINANCE_SYSTEM'
        });

    } catch (error) {
        console.error('Error updating project from finance system:', error);
        
        return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
        );
    }
}