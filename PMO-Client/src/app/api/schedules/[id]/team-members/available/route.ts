import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/team-members/available - Get available users with their workload
export async function GET(
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

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        // user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get all users
    const allUsers = await prisma.user.findMany({
      include: {
        account: true,
        role: true,
      },
      orderBy: [
        { account: { first_name: 'asc' } },
        { account: { last_name: 'asc' } },
      ],
    });

    // Get current team members of this schedule
    const currentTeamMembers = await prisma.scheduleTeamMember.findMany({
      where: { schedule_id: scheduleId },
      select: { user_id: true },
    });

    const currentTeamMemberIds = currentTeamMembers.map(tm => tm.user_id);

    // Filter out users who are already team members and get their workload
    const availableUsers = await Promise.all(
      allUsers
        .filter(user => !currentTeamMemberIds.includes(user.user_id))
        .map(async (user) => {
          // Get user's total workload across all projects only
          const projectWorkload = await prisma.projectTeamMember.aggregate({
            where: {
              user_id: user.user_id,
              project: {
                start_date: { lte: schedule.planned_end_date },
                planned_end_date: { gte: schedule.start_date },
              }
            },
            _sum: {
              workload: true
            }
          });

          const totalWorkload = projectWorkload._sum.workload || 0;
          const availableWorkload = Math.max(0, 100 - totalWorkload);

          return {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            account: user.account,
            role: user.role,
            currentWorkload: totalWorkload,
            availableWorkload: availableWorkload,
            isAvailable: availableWorkload > 0,
          };
        })
    );

    // Sort by availability (available first) then by available workload (descending)
    const sortedUsers = availableUsers.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) {
        return b.isAvailable ? 1 : -1;
      }
      return b.availableWorkload - a.availableWorkload;
    });

    return NextResponse.json(sortedUsers);
  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available users' },
      { status: 500 }
    );
  }
} 