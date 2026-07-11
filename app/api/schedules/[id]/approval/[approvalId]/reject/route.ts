import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// POST /api/schedules/[id]/approval/[approvalId]/reject
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
  // Update status to REJECTED
  const updated = await prisma.scheduleApproval.update({
    where: { id: approvalIdNum },
    data: { status: 'REJECTED' },
  });
  return NextResponse.json(updated);
} 