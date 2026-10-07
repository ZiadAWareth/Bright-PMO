import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

const AS = {
  PENDING: 'PENDING',
  WAITING: 'WAITING',
} as const;

/**
 * @swagger
 * /api/projects/{id}/approval:
 *   post:
 *     summary: Create project approvals for users
 *     description: Creates ProjectApproval records for a list of users. Validates that no duplicate approvals exist for the same user role.
 *     tags:
 *       - Projects
 *       - Approvals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to create approvals for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to create approvals for
 *     responses:
 *       200:
 *         description: Project approvals created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 approvals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       project_id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       status:
 *                         type: string
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Project not found
 *       409:
 *         description: Conflict - approval already exists for user role
 *       500:
 *         description: Server error
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    
    try {
        const projectId = parseInt(id, 10);
        const body = await req.json();
        const { userIds, type: approvalType = 'PROJECT_CREATION', pendingBudgetAmount } = body;
        const isBudgetChange = approvalType === 'BUDGET_CHANGE';

        // Validate input
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: 'userIds array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { project_id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Get current user for audit trail
        const currentUser = await getUserFromHeaders();

        if (isBudgetChange) {
            // BUDGET_CHANGE: 2-step sequential workflow — PMO (step 1) → Finance (step 2)
            // No creator self-confirmation step; the submission itself is the requester action.
            if (userIds.length !== 2) {
                return NextResponse.json(
                    { error: 'Provide exactly 2 userIds: [pmoUserId, finUserId]' },
                    { status: 400 }
                );
            }

            if (!pendingBudgetAmount || isNaN(Number(pendingBudgetAmount)) || Number(pendingBudgetAmount) <= 0) {
                return NextResponse.json(
                    { error: 'pendingBudgetAmount is required and must be a positive number' },
                    { status: 400 }
                );
            }

            // Guard: a budget-change approval is already in-flight
            const existingBudgetApproval = await (prisma.projectApproval as any).findFirst({
                where: {
                    project_id: projectId,
                    type: 'BUDGET_CHANGE',
                    status: { notIn: ['APPROVED', 'REJECTED'] }
                }
            });
            if (existingBudgetApproval) {
                return NextResponse.json(
                    { error: 'A budget change approval is already in progress for this project' },
                    { status: 409 }
                );
            }

            const [pmoUserId, finUserId] = userIds;

            // Atomically stage the pending budget and create the 2-step approval chain
            await prisma.$transaction([
                prisma.project.update({
                    where: { project_id: projectId },
                    data: { pending_budget_amount: Number(pendingBudgetAmount) },
                }),
                (prisma.projectApproval as any).createMany({
                    data: [
                        { project_id: projectId, user_id: pmoUserId, step: 1, status: AS.PENDING, type: 'BUDGET_CHANGE' },
                        { project_id: projectId, user_id: finUserId, step: 2, status: AS.WAITING, type: 'BUDGET_CHANGE' },
                    ]
                }),
            ]);

            // Notify the PMO immediately
            await prisma.notification.create({
                data: {
                    user_id: pmoUserId,
                    type: 'PROJECT_UPDATE',
                    title: 'Budget Change Approval Required (PMO Review)',
                    message: `A planned budget change for project "${project.name}" requires your PMO review.`,
                    priority: 'HIGH',
                    created_by_id: currentUser.userId,
                    metadata: { project_id: projectId, approval_step: 1, approval_type: 'BUDGET_CHANGE' }
                }
            });

        } else {
            // PROJECT_CREATION: original 3-step sequential workflow
            if (userIds.length !== 2) {
                return NextResponse.json(
                    { error: 'Provide exactly 2 userIds: [pjmUserId, finUserId]' },
                    { status: 400 }
                );
            }

            // Guard: approvals already exist
            const existingCount = await (prisma.projectApproval as any).count({
                where: { project_id: projectId, type: 'PROJECT_CREATION' }
            });
            if (existingCount > 0) {
                return NextResponse.json(
                    { error: 'Approval workflow already exists for this project' },
                    { status: 409 }
                );
            }

            const [pjmUserId, finUserId] = userIds;
            const creatorUserId = project.created_by;

            await (prisma.projectApproval as any).createMany({
                data: [
                    { project_id: projectId, user_id: creatorUserId, step: 1, status: AS.PENDING,  type: 'PROJECT_CREATION' },
                    { project_id: projectId, user_id: pjmUserId,     step: 2, status: AS.WAITING,  type: 'PROJECT_CREATION' },
                    { project_id: projectId, user_id: finUserId,     step: 3, status: AS.WAITING,  type: 'PROJECT_CREATION' },
                ]
            });

            // Move project to pending_approval now that the workflow has started
            await prisma.project.update({
                where: { project_id: projectId },
                data: { status: 'pending_approval' }
            });

            // Notify ONLY the creator (step 1) — PJM and FIN are WAITING and silent
            await prisma.notification.create({
                data: {
                    user_id: creatorUserId,
                    type: 'PROJECT_CREATION',
                    title: 'Your Project Awaits Your Approval',
                    message: `Project "${project.name}" is ready for your review. Approve it when you are satisfied to advance it to PJM review.`,
                    priority: 'HIGH',
                    created_by_id: currentUser.userId,
                    metadata: { project_id: projectId, approval_step: 1 }
                }
            });
        }

        // Fetch the newly created approvals with user details for the response
        const createdApprovalsWithDetails = await (prisma.projectApproval as any).findMany({
            where: { project_id: projectId, type: approvalType },
            include: {
                user: {
                    include: {
                        account: { select: { first_name: true, last_name: true } },
                        role:    { select: { name: true } }
                    }
                }
            },
            orderBy: { step: 'asc' }
        });

        return NextResponse.json({
            message: isBudgetChange
                ? 'Budget change approval workflow created with 2 sequential steps.'
                : 'Approval workflow created with 3 sequential steps.',
            approvals: createdApprovalsWithDetails,
        }, { status: 200 });

    } catch (error) {
        console.error('Error creating project approvals:', error);
        return NextResponse.json(
            { error: 'Failed to create project approvals' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/projects/{id}/approval:
 *   get:
 *     summary: Get project approvals
 *     description: Retrieves all ProjectApproval records for a specific project
 *     tags:
 *       - Projects
 *       - Approvals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to get approvals for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project approvals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   user_id:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   user:
 *                     type: object
 *                     properties:
 *                       account:
 *                         type: object
 *                         properties:
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *                       role:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    
    try {
        const projectId = parseInt(id, 10);
        
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { project_id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Get all approvals for the project
        const approvals = await prisma.projectApproval.findMany({
            where: {
                project_id: projectId
            },
            include: {
                user: {
                    include: {
                        account: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        },
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(approvals, { status: 200 });

    } catch (error) {
        console.error('Error fetching project approvals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project approvals' },
            { status: 500 }
        );
    }
} 