import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/approval
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id);
  if (isNaN(scheduleId)) {
    return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
  }
  const approvals = await prisma.scheduleApproval.findMany({
    where: { schedule_id: scheduleId },
    include: {
      user: {
        include: { account: true, role: true },
      },
    },
  });
  return NextResponse.json(approvals);
}

// POST /api/schedules/[id]/approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id);
  if (isNaN(scheduleId)) {
    return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
  }
  const { userIds } = await request.json();
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
  }
  // Prevent duplicates
  const existing = await prisma.scheduleApproval.findMany({
    where: { schedule_id: scheduleId, user_id: { in: userIds } },
  });
  const existingIds = new Set(existing.map(a => a.user_id));
  const toCreate = userIds.filter(id => !existingIds.has(id));
  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0 });
  }
  const created = await prisma.scheduleApproval.createMany({
    data: toCreate.map(user_id => ({
      schedule_id: scheduleId,
      user_id,
    })),
    skipDuplicates: true,
  });
  // Update schedule status to 'pending_approval'
  await prisma.projectSchedule.update({
    where: { schedule_id: scheduleId },
    data: { status: 'pending_approval' },
  });
  return NextResponse.json({ created: created.count });
} 