import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

/**
 * @swagger
 * /api/approvals/{id}:
 *   get:
 *     summary: Get a specific approval
 *     description: Retrieves details of a specific approval request by ID
 *     tags:
 *       - Approvals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the approval to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Approval'
 *       404:
 *         description: Approval not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    try {
        const approvalId = parseInt(id);
        
        const approval = await prisma.approval.findUnique({
            where: {
                approval_id: approvalId
            }
        });

        if (!approval) {
            return NextResponse.json(
                { error: "Approval not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(approval);
    } catch (error) {
        console.error('Error fetching approval:', error);
        return NextResponse.json(
            { error: 'Failed to fetch approval' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/approvals/{id}:
 *   patch:
 *     summary: Update approval status
 *     description: Update the status of an approval request (approve or reject)
 *     tags:
 *       - Approvals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the approval to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 description: New status for the approval
 *               comments:
 *                 type: string
 *                 description: Optional comments about the decision
 *     responses:
 *       200:
 *         description: Approval updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Approval'
 *       401:
 *         description: Unauthorized or invalid token
 *       404:
 *         description: Approval not found or not targeted at authenticated user
 *       500:
 *         description: Server error
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id: idString } = resolvedParams;
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return new Response('Unauthorized', { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return new Response('Invalid token', { status: 401 });
        }
        const approvalId = parseInt(idString);
        const userId = decoded.userId as number;
        const { status, comments } = await req.json();

        // Verify this approval is targeted at this user
        const approval = await prisma.approval.findFirst({
            where: {
                approval_id: approvalId,
                target_user_id: userId,
                status: 'PENDING'
            }
        });

        if (!approval) {
            return NextResponse.json(
                { error: "Approval not found or not targeted at you" },
                { status: 404 }
            );
        }

        // Fetch the project to get required_approvals
        const project = await prisma.project.findUnique({
            where: {
                project_id: approval.project_id
            }
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // Update the approval
        const updatedApproval = await prisma.approval.update({
            where: {
                approval_id: approvalId
            },
            data: {
                status: status,
                approved_by: userId,
                comments: comments || 'No comments provided'
            }
        });

        // If this approval is for a checklist and it's approved, update the checklist status
        if (approval.checklist_id && status === 'APPROVED') {
            await prisma.projectChecklist.update({
                where: {
                    checklist_id: approval.checklist_id
                },
                data: {
                    status: 'APPROVED',
                    approved_by: userId,
                    approved_at: new Date()
                }
            });
        } else if (approval.checklist_id && status === 'REJECTED') {
            await prisma.projectChecklist.update({
                where: {
                    checklist_id: approval.checklist_id
                },
                data: {
                    status: 'REJECTED',
                    approved_by: userId,
                    approved_at: new Date()
                }
            });
        }

        // Count how many approvals we have for this project
        const approvalCount = await prisma.approval.count({
            where: {
                project_id: approval.project_id,
                status: 'APPROVED'
            }
        });

        // If we have enough approvals, update the project status
        if (approvalCount >= project.required_approvals) {
            await prisma.project.update({
                where: {
                    project_id: approval.project_id
                },
                data: {
                    status: 'approved'
                }
            });
        }

        return NextResponse.json(updatedApproval);
    } catch (error) {
        console.error('Error updating approval:', error);
        return NextResponse.json(
            { error: 'Failed to update approval' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/approvals/{id}:
 *   delete:
 *     summary: Delete an approval
 *     description: Deletes a pending approval request
 *     tags:
 *       - Approvals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the approval to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Approval deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Approval not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return new Response('Unauthorized', { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return new Response('Invalid token', { status: 401 });
        }

        const approvalId = parseInt(id);
        
        // Check if the approval exists
        const approval = await prisma.approval.findUnique({
            where: {
                approval_id: approvalId
            }
        });

        if (!approval) {
            return NextResponse.json(
                { error: "Approval not found" },
                { status: 404 }
            );
        }

        // Only allow deletion of pending approvals
        if (approval.status !== 'PENDING') {
            return NextResponse.json(
                { error: "Only pending approvals can be deleted" },
                { status: 400 }
            );
        }

        // Delete the approval
        await prisma.approval.delete({
            where: {
                approval_id: approvalId
            }
        });

        return NextResponse.json({ 
            message: "Approval deleted successfully" 
        });
    } catch (error) {
        console.error('Error deleting approval:', error);
        return NextResponse.json(
            { error: 'Failed to delete approval' },
            { status: 500 }
        );
    }
} 