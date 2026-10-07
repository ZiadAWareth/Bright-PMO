import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * POST /api/projects/:id/approval/re-request
 *
 * Called by the project creator after addressing revision notes.
 * Finds the approval currently in REVISION_REQUESTED state, resets it to PENDING,
 * and notifies the reviewer so they know the project is ready for re-review.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const { userId } = await getUserFromHeaders();

    // Parse optional body fields for budget change re-submit
    const body = await request.json().catch(() => ({}));
    const { approvalType, pendingBudgetAmount } = body as {
      approvalType?: string;
      pendingBudgetAmount?: number;
    };

    const isBudgetChange = approvalType === 'BUDGET_CHANGE';

    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // For project creation flow, only the creator can re-request
    if (!isBudgetChange && project.created_by !== userId) {
      return NextResponse.json(
        { error: 'Only the project creator can re-request a review' },
        { status: 403 }
      );
    }

    // For budget change, validate the new amount
    if (isBudgetChange) {
      if (!pendingBudgetAmount || isNaN(Number(pendingBudgetAmount)) || Number(pendingBudgetAmount) <= 0) {
        return NextResponse.json(
          { error: 'A valid pendingBudgetAmount is required to re-submit a budget change' },
          { status: 400 }
        );
      }
    }

    // Find the approval currently awaiting revision (scoped by type when relevant)
    const pendingRevision = await (prisma.projectApproval as any).findFirst({
      where: {
        project_id: projectId,
        status: 'REVISION_REQUESTED',
        ...(isBudgetChange ? { type: 'BUDGET_CHANGE' } : {}),
      },
      include: {
        user: { include: { account: true, role: true } }
      }
    });

    if (!pendingRevision) {
      return NextResponse.json(
        { error: 'No pending revision found for this project' },
        { status: 400 }
      );
    }

    if (isBudgetChange) {
      // Fetch all budget-change approvals for this project ordered by step
      const allBudgetApprovals = await (prisma.projectApproval as any).findMany({
        where: { project_id: projectId, type: 'BUDGET_CHANGE' },
        orderBy: { step: 'asc' },
      });

      // Reset the entire chain: step 1 → PENDING, all subsequent steps → WAITING
      // This ensures PMO re-reviews the new amount before Finance gets to act.
      await prisma.$transaction([
        prisma.project.update({
          where: { project_id: projectId },
          data: { pending_budget_amount: Number(pendingBudgetAmount) },
        }),
        ...(allBudgetApprovals as any[]).map((a: any, index: number) =>
          (prisma.projectApproval as any).update({
            where: { id: a.id },
            data: {
              status: index === 0 ? 'PENDING' : 'WAITING',
              reviewed_at: null,
              comments: null,
            },
          })
        ),
      ]);

      // Notify step 1 (PMO) — they go first on the fresh chain
      const step1 = allBudgetApprovals[0];
      if (step1) {
        await prisma.notification.create({
          data: {
            user_id: step1.user_id,
            type: 'PROJECT_UPDATE',
            title: 'Revised Budget Submitted for Re-Review',
            message: `A revised budget of OMR ${Number(pendingBudgetAmount).toLocaleString()} has been re-submitted for project "${project.name}". Please review it again.`,
            priority: 'HIGH',
            created_by_id: userId,
            metadata: { project_id: projectId, approval_id: step1.id, approval_type: 'BUDGET_CHANGE' }
          }
        });
      }
    } else {
      // Project creation — reset back to PENDING so the reviewer can act again
      await prisma.projectApproval.update({
        where: { id: pendingRevision.id },
        data: { status: 'PENDING', reviewed_at: null },
      });

      await prisma.notification.create({
        data: {
          user_id: pendingRevision.user_id,
          type: 'PROJECT_UPDATE',
          title: 'Project Ready for Re-Review',
          message: `The creator has addressed your revision notes on project "${project.name}". Please review it again.`,
          priority: 'HIGH',
          created_by_id: userId,
          metadata: { project_id: projectId, approval_id: pendingRevision.id }
        }
      });
    }

    return NextResponse.json({
      message: isBudgetChange
        ? 'Revised budget re-submitted. The PMO has been notified.'
        : 'Re-review requested successfully. The reviewer has been notified.',
    });

  } catch (error) {
    console.error('Error re-requesting review:', error);
    return NextResponse.json({ error: 'Failed to re-request review' }, { status: 500 });
  }
}
