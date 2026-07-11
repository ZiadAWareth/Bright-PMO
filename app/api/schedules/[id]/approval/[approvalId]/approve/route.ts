import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { migrateScheduleToProject } from '@/lib/server/entities';

// POST /api/schedules/[id]/approval/[approvalId]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const { id, approvalId } = await params;
  const { userId } = await getUserFromHeaders();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const approvalIdNum = parseInt(approvalId);
  if (isNaN(approvalIdNum)) {
    return NextResponse.json({ error: 'Invalid approval ID' }, { status: 400 });
  }
  // Find the approval and verify user
  const approval = await prisma.scheduleApproval.findUnique({ where: { id: approvalIdNum } });
  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  }
  if (approval.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Update status to APPROVED
  const updated = await prisma.scheduleApproval.update({
    where: { id: approvalIdNum },
    data: { status: 'APPROVED' },
  });

  // Fetch all approvals for this schedule
  const allApprovals = await prisma.scheduleApproval.findMany({
    where: { schedule_id: approval.schedule_id },
  });
  const allApproved = allApprovals.every(a => a.status === 'APPROVED');
  console.log(`All approvals approved for schedule ${approval.schedule_id}:`, allApproved);

  if (allApproved) {
    const projectId = await migrateScheduleToProject(approval.schedule_id);
    console.log(`Schedule ${approval.schedule_id} migrated to project ${projectId}`);
    // Update the schedule status to 'approved'
    await prisma.projectSchedule.update({
      where: { schedule_id: approval.schedule_id },
      data: { status: 'approved' },
    });
  }

  return NextResponse.json(updated);
} 