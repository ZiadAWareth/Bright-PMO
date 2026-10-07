import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// POST /api/schedules/[id]/submit-for-approval - Submit schedule for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    // Verify schedule belongs to user and is in feasible status
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
        status: 'feasible',
      },
      include: {
        conflicts: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ 
        error: 'Schedule not found or not in feasible status' 
      }, { status: 404 });
    }

    // Check if there are any unresolved conflicts
    const unresolvedConflicts = schedule.conflicts.filter(conflict => !conflict.resolved);
    if (unresolvedConflicts.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot submit for approval: unresolved conflicts exist',
        conflicts: unresolvedConflicts
      }, { status: 400 });
    }

    // Update schedule status to pending_approval
    const updatedSchedule = await prisma.projectSchedule.update({
      where: { schedule_id: scheduleId },
      data: {
        status: 'pending_approval',
      },
      include: {
        creator: {
          include: {
            account: true,
          },
        },
        conflicts: {
          where: { resolved: false },
        },
      },
    });

    return NextResponse.json({
      schedule: updatedSchedule,
      message: 'Schedule submitted for approval successfully',
    });
  } catch (error) {
    console.error('Error submitting schedule for approval:', error);
    return NextResponse.json(
      { error: 'Failed to submit schedule for approval' },
      { status: 500 }
    );
  }
} 