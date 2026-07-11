import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/approvals:
 *   get:
 *     summary: Get all approvals
 *     description: Retrieves a list of all approval requests in the system
 *     tags:
 *       - Approvals
 *     responses:
 *       200:
 *         description: A list of approval requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   approval_id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                     description: Type of approval (PROJECT_CREATION, BUDGET_CHANGE, etc.)
 *                   status:
 *                     type: string
 *                     enum: [PENDING, APPROVED, REJECTED]
 *                   requested_by:
 *                     type: integer
 *                     description: User ID of the requester
 *                   target_user_id:
 *                     type: integer
 *                     description: User ID of the approver
 *                   comments:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
// GET all approvals
export async function GET(req: Request) {
    const allApprovalRequests = await prisma.approval.findMany();
    return NextResponse.json(allApprovalRequests);
}

/**
 * @swagger
 * /api/approvals:
 *   post:
 *     summary: Create a new approval request
 *     description: Creates a new approval request in the system
 *     tags:
 *       - Approvals
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - requested_by
 *               - target_user_id
 *             properties:
 *               type:
 *                 type: string
 *                 description: Type of approval (PROJECT_CREATION, BUDGET_CHANGE, etc.)
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *                 default: PENDING
 *               requested_by:
 *                 type: integer
 *                 description: User ID of the requester
 *               target_user_id:
 *                 type: integer
 *                 description: User ID of the approver
 *               comments:
 *                 type: string
 *                 description: Additional context for the approval
 *     responses:
 *       200:
 *         description: Approval request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 approval_id:
 *                   type: integer
 *                 type:
 *                   type: string
 *                 status:
 *                   type: string
 *                 requested_by:
 *                   type: integer
 *                 target_user_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
// POST approval request
export async function POST(req: Request) {
    const entry = await req.json();
    console.log('Received approval request:', entry);
    const approval = await prisma.approval.create({
        data: entry
    });
    return NextResponse.json(approval);
}
