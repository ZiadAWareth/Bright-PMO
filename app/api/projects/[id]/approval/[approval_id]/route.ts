import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// Local constants for enum values added by migration (avoids stale @prisma/client re-export)
const AS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  WAITING: 'WAITING',
} as const;
type AS = typeof AS[keyof typeof AS];

/**
 * @swagger
 * /api/projects/{id}/approval/{approval_id}:
 *   patch:
 *     summary: Update project approval status
 *     description: Updates the status of a specific project approval (approve/reject)
 *     tags:
 *       - Projects
 *       - Approvals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: integer
 *       - in: path
 *         name: approval_id
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
 *     responses:
 *       200:
 *         description: Approval updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User can only update their own approval
 *       404:
 *         description: Project or approval not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; approval_id: string }> }
) {
  try {
    const { id, approval_id } = await params;
    const projectId = parseInt(id);
    const approvalId = parseInt(approval_id);
    
    if (isNaN(projectId) || isNaN(approvalId)) {
      return NextResponse.json(
        { error: 'Invalid project ID or approval ID' },
        { status: 400 }
      );
    }

    // Get current user
    const {userId} = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { status, comments } = body;

    const VALID_STATUSES: AS[] = [AS.APPROVED, AS.REJECTED, AS.REVISION_REQUESTED];
    if (!status || !VALID_STATUSES.includes(status as AS)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, REJECTED, or REVISION_REQUESTED' },
        { status: 400 }
      );
    }

    if (status === AS.REVISION_REQUESTED && !comments?.trim()) {
      return NextResponse.json(
        { error: 'comments are required when requesting a revision' },
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

    // Check if approval exists and belongs to the current user
    const approval = await prisma.projectApproval.findFirst({
      where: {
        id: approvalId,
        project_id: projectId,
        user_id: userId
      },
      include: {
        user: {
          include: {
            account: true,
            role: true
          }
        }
      }
    });

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    // Step 2 (FIN) cannot act while still WAITING for step 1 (PJM)
    if ((approval.status as string) === AS.WAITING) {
      return NextResponse.json(
        { error: 'This approval is waiting for the previous step to be completed first' },
        { status: 403 }
      );
    }

    // Already processed (but allow re-submission after REVISION_REQUESTED)
    if (!([AS.PENDING, AS.REVISION_REQUESTED] as string[]).includes(approval.status as string)) {
      return NextResponse.json(
        { error: 'Approval has already been processed' },
        { status: 400 }
      );
    }

    // Update the approval with decision + timestamp
    const updatedApproval = await (prisma.projectApproval as any).update({
      where: { id: approvalId },
      data: {
        status,
        comments: comments ?? (approval as any).comments,
        reviewed_at: new Date(),
      },
      include: {
        user: {
          include: {
            account: true,
            role: true
          }
        }
      }
    });

    const reviewerName = approval.user.account
      ? `${approval.user.account.first_name} ${approval.user.account.last_name}`.trim()
      : approval.user.role.name;

    const approvalAny = approval as any; // step/comments added by migration; typed after prisma generate

    const isBudgetChange = (approvalAny.type as string) === 'BUDGET_CHANGE';

    // --- Sequential flow dispatch ---
    if (status === AS.REJECTED) {
      if (isBudgetChange) {
        // Budget change rejected — close any remaining non-terminal steps so requester can submit again
        await prisma.$transaction([
          prisma.project.update({
            where: { project_id: projectId },
            data: { pending_budget_amount: null }
          }),
          (prisma.projectApproval as any).updateMany({
            where: {
              project_id: projectId,
              type: 'BUDGET_CHANGE',
              id: { not: approvalId },
              status: { notIn: [AS.APPROVED, AS.REJECTED] }
            },
            data: {
              status: AS.REJECTED,
              reviewed_at: new Date(),
            }
          })
        ]);
        await prisma.notification.create({
          data: {
            user_id: project.created_by,
            type: 'PROJECT_UPDATE',
            title: 'Budget Change Rejected',
            message: `The planned budget change for project "${project.name}" was rejected by ${reviewerName} (${approval.user.role.name}).${comments ? ` Reason: ${comments}` : ''}`,
            priority: 'URGENT',
            created_by_id: userId,
            metadata: { project_id: projectId, approval_id: approvalId, approval_type: 'BUDGET_CHANGE' }
          }
        });
      } else {
        // Project creation rejected — move project to rejected status
        await prisma.project.update({
          where: { project_id: projectId },
          data: { status: 'rejected' }
        });
        await prisma.notification.create({
          data: {
            user_id: project.created_by,
            type: 'PROJECT_UPDATE',
            title: 'Project Rejected',
            message: `Your project "${project.name}" was rejected by ${reviewerName} (${approval.user.role.name}).${comments ? ` Reason: ${comments}` : ''}`,
            priority: 'URGENT',
            created_by_id: userId,
            metadata: { project_id: projectId, approval_id: approvalId }
          }
        });
      }

    } else if (status === AS.REVISION_REQUESTED) {
      // Notify the project creator with the reviewer's notes (same for both types)
      await prisma.notification.create({
        data: {
          user_id: project.created_by,
          type: 'PROJECT_UPDATE',
          title: isBudgetChange ? 'Budget Change Revision Requested' : 'Revision Requested',
          message: `${reviewerName} (${approval.user.role.name}) requested changes on ${isBudgetChange ? 'the budget change for' : ''} project "${project.name}": ${comments}`,
          priority: 'HIGH',
          created_by_id: userId,
          metadata: { project_id: projectId, approval_id: approvalId }
        }
      });

    } else if (status === AS.APPROVED) {
      if (isBudgetChange) {
        // --- BUDGET_CHANGE: 2-step flow — PMO (1) → Finance (2) ---
        if (approvalAny.step === 1) {
          // PMO approved — unlock Finance (step 2)
          await (prisma.projectApproval as any).updateMany({
            where: { project_id: projectId, type: 'BUDGET_CHANGE', step: 2, status: AS.WAITING },
            data: { status: AS.PENDING }
          });
          const step2Approval = await (prisma.projectApproval as any).findFirst({
            where: { project_id: projectId, type: 'BUDGET_CHANGE', step: 2 }
          });
          if (step2Approval) {
            await prisma.notification.create({
              data: {
                user_id: step2Approval.user_id,
                type: 'PROJECT_UPDATE',
                title: 'Budget Change Approval Required (Finance Review)',
                message: `The planned budget change for project "${project.name}" passed PMO review and now requires your financial approval.`,
                priority: 'HIGH',
                created_by_id: userId,
                metadata: { project_id: projectId, approval_step: 2, approval_type: 'BUDGET_CHANGE' }
              }
            });
          }

        } else if (approvalAny.step === 2) {
          // Finance approved — apply the pending budget and notify requester
          const projectAny = project as any;
          await prisma.project.update({
            where: { project_id: projectId },
            data: {
              budget_amount: projectAny.pending_budget_amount ?? project.budget_amount,
              pending_budget_amount: null,
            }
          });
          await prisma.notification.create({
            data: {
              user_id: project.created_by,
              type: 'PROJECT_UPDATE',
              title: 'Budget Change Approved',
              message: `The planned budget change for project "${project.name}" has been approved by PMO and Finance. The new budget is now active.`,
              priority: 'HIGH',
              created_by_id: userId,
              metadata: { project_id: projectId, approval_type: 'BUDGET_CHANGE' }
            }
          });
        }

      } else {
        // --- PROJECT_CREATION: 3-step flow — Creator (1) → PJM (2) → Finance (3) ---
        if (approvalAny.step === 1) {
          // Creator approved — unlock step 2 (PJM) and notify them
          await (prisma.projectApproval as any).updateMany({
            where: { project_id: projectId, type: 'PROJECT_CREATION', step: 2, status: AS.WAITING },
            data: { status: AS.PENDING }
          });
          const step2Approval = await (prisma.projectApproval as any).findFirst({
            where: { project_id: projectId, type: 'PROJECT_CREATION', step: 2 }
          });
          if (step2Approval) {
            await prisma.notification.create({
              data: {
                user_id: step2Approval.user_id,
                type: 'PROJECT_CREATION',
                title: 'Project Approval Required (PJM Review)',
                message: `Project "${project.name}" has been approved by the creator and now requires your PJM review.`,
                priority: 'HIGH',
                created_by_id: userId,
                metadata: { project_id: projectId, approval_step: 2 }
              }
            });
          }

        } else if (approvalAny.step === 2) {
          // PJM approved — unlock step 3 (Finance) and notify them
          await (prisma.projectApproval as any).updateMany({
            where: { project_id: projectId, type: 'PROJECT_CREATION', step: 3, status: AS.WAITING },
            data: { status: AS.PENDING }
          });
          const step3Approval = await (prisma.projectApproval as any).findFirst({
            where: { project_id: projectId, type: 'PROJECT_CREATION', step: 3 }
          });
          if (step3Approval) {
            await prisma.notification.create({
              data: {
                user_id: step3Approval.user_id,
                type: 'PROJECT_CREATION',
                title: 'Financial Approval Required',
                message: `Project "${project.name}" passed PJM review and now requires your financial approval.`,
                priority: 'HIGH',
                created_by_id: userId,
                metadata: { project_id: projectId, approval_step: 3 }
              }
            });
          }

        } else if (approvalAny.step === 3) {
          // Finance approved — all 3 steps done → execution
          await prisma.project.update({
            where: { project_id: projectId },
            data: { status: 'execution' }
          });
          await prisma.notification.create({
            data: {
              user_id: project.created_by,
              type: 'PROJECT_UPDATE',
              title: 'Project Fully Approved',
              message: `Your project "${project.name}" has been approved by all reviewers and moved to execution.`,
              priority: 'HIGH',
              created_by_id: userId,
              metadata: { project_id: projectId }
            }
          });
          await prisma.notification.create({
            data: {
              user_id: project.manager_id,
              type: 'PROJECT_CREATION',
              title: 'Project Ready for Execution',
              message: `Project "${project.name}" has been fully approved and is now in the execution phase. You are the assigned Project Manager.`,
              priority: 'HIGH',
              created_by_id: userId,
              metadata: { project_id: projectId }
            }
          });
        }
      }
    }

    return NextResponse.json(updatedApproval);

  } catch (error) {
    console.error('Error updating project approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 