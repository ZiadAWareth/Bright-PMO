import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/schedules/{schedule_id}/team-members/{team_member_id}:
 *   delete:
 *     summary: Remove a team member from a schedule
 *     description: Removes a specific team member from a schedule
 *     tags:
 *       - Schedule Team Members
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the schedule
 *         schema:
 *           type: integer
 *       - in: path
 *         name: team_member_id
 *         required: true
 *         description: ID of the team member to remove
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team member removed successfully
 *       404:
 *         description: Schedule or team member not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamMemberId: string }> }
) {
  try {
    const { id: scheduleId, teamMemberId } = await params;
    const { userId } = await getUserFromHeaders();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleIdNum = parseInt(scheduleId);
    const teamMemberIdNum = parseInt(teamMemberId);

    if (isNaN(scheduleIdNum) || isNaN(teamMemberIdNum)) {
      return NextResponse.json({ error: 'Invalid ID parameters' }, { status: 400 });
    }

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleIdNum,
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Check if team member exists and belongs to this schedule
    const teamMember = await prisma.scheduleTeamMember.findFirst({
      where: {
        team_member_id: teamMemberIdNum,
        schedule_id: scheduleIdNum,
      },
      include: {
        user: {
          include: {
            account: true
          }
        }
      }
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Delete the team member
    await prisma.scheduleTeamMember.delete({
      where: {
        team_member_id: teamMemberIdNum,
      },
    });

    return NextResponse.json(
      { 
        message: 'Team member removed successfully',
        removedMember: {
          team_member_id: teamMemberIdNum,
          user_name: teamMember.user.account 
            ? `${teamMember.user.account.first_name} ${teamMember.user.account.last_name}`
            : teamMember.user.username,
          username: teamMember.user.username
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
} 