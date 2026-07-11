import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/team-members - Get all team members for a schedule
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

    const { searchParams } = new URL(request.url);
    const includeWorkload = searchParams.get('includeWorkload') === 'true';

    const teamMembers = await prisma.scheduleTeamMember.findMany({
      where: { schedule_id: scheduleId },
      include: {
        user: {
          include: {
            account: true,
            role: true,
          },
        },
      },
      orderBy: [
        { is_lead: 'desc' },
        { role: 'asc' },
        { user: { account: { first_name: 'asc' } } },
      ],
    });

    // If requested, add current workload information for each team member
    if (includeWorkload) {
      const teamMembersWithWorkload = await Promise.all(
        teamMembers.map(async (member) => {
          // Get user's total workload across all projects only
          const projectWorkload = await prisma.projectTeamMember.aggregate({
            where: {
              user_id: member.user_id,
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

          return {
            ...member,
            totalWorkload,
            availableWorkload: Math.max(0, 100 - totalWorkload)
          };
        })
      );

      return NextResponse.json(teamMembersWithWorkload);
    }

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/team-members - Add a team member to the schedule
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

    const body = await request.json();
    const {
      resource_id, // This is actually the user_id from the frontend
      role,
      department,
      workload,
      is_lead,
    } = body;

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Validate required fields
    if (!resource_id || !role || !department || workload === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, department, workload' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(resource_id) },
      include: {
        account: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }

    // Check if user is already a team member of this schedule
    const existingTeamMember = await prisma.scheduleTeamMember.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: parseInt(resource_id),
      },
    });

    if (existingTeamMember) {
      return NextResponse.json(
        { error: 'User is already a team member of this schedule' },
        { status: 400 }
      );
    }

    // If user is trying to be a lead, remove any existing team lead
    if (is_lead) {
      await prisma.scheduleTeamMember.updateMany({
        where: {
          schedule_id: scheduleId,
          is_lead: true,
        },
        data: {
          is_lead: false,
        },
      });
    }

    // Validate workload
    const workloadValue = parseFloat(workload);
    if (isNaN(workloadValue) || workloadValue < 0 || workloadValue > 100) {
      return NextResponse.json(
        { error: 'Workload must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Check user's total workload across all projects only
    const targetUserId = parseInt(resource_id);
    
    // Get user's existing workload from project team members only
    const projectWorkload = await prisma.projectTeamMember.aggregate({
      where: {
        user_id: targetUserId,
        project: {
          // Only consider projects that overlap with this schedule's timeline
          start_date: { lte: schedule.planned_end_date },
          planned_end_date: { gte: schedule.start_date },
        }
      },
      _sum: {
        workload: true
      }
    });

    const existingWorkload = projectWorkload._sum.workload || 0;
    const totalWorkload = existingWorkload + workloadValue;

    if (totalWorkload > 100) {
      return NextResponse.json(
        { 
          error: `User workload would exceed 100%. Current project workload: ${existingWorkload}%, requested: ${workloadValue}%, total: ${totalWorkload}%` 
        },
        { status: 400 }
      );
    }

    const teamMember = await prisma.scheduleTeamMember.create({
      data: {
        schedule_id: scheduleId,
        user_id: parseInt(resource_id),
        role: role,
        department: department,
        workload: workloadValue,
        is_lead: is_lead || false,
      },
      include: {
        user: {
          include: {
            account: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id]/team-members - Update a team member
export async function PUT(
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

    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('team_member_id');

    if (!teamMemberId) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role, department, workload, is_lead } = body;

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Verify team member exists and belongs to this schedule
    const existingTeamMember = await prisma.scheduleTeamMember.findFirst({
      where: {
        team_member_id: parseInt(teamMemberId),
        schedule_id: scheduleId,
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!existingTeamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // If trying to make this user a lead, remove any existing team lead
    if (is_lead) {
      await prisma.scheduleTeamMember.updateMany({
        where: {
          schedule_id: scheduleId,
          team_member_id: { not: parseInt(teamMemberId) },
          is_lead: true,
        },
        data: {
          is_lead: false,
        },
      });
    }

    // Validate workload if provided
    if (workload !== undefined) {
      const workloadValue = parseFloat(workload);
      if (isNaN(workloadValue) || workloadValue < 0 || workloadValue > 100) {
        return NextResponse.json(
          { error: 'Workload must be a number between 0 and 100' },
          { status: 400 }
        );
      }

      // Check user's total workload across all projects only (excluding this schedule)
      const targetUserId = existingTeamMember.user_id;
      const projectWorkload = await prisma.projectTeamMember.aggregate({
        where: {
          user_id: targetUserId,
          project: {
            start_date: { lte: schedule.planned_end_date },
            planned_end_date: { gte: schedule.start_date },
          }
        },
        _sum: {
          workload: true
        }
      });

      const otherScheduleWorkload = await prisma.scheduleTeamMember.aggregate({
        where: {
          user_id: targetUserId,
          schedule_id: { not: scheduleId },
          schedule: {
            start_date: { lte: schedule.planned_end_date },
            planned_end_date: { gte: schedule.start_date },
          }
        },
        _sum: {
          workload: true
        }
      });

      const existingWorkload = (projectWorkload._sum.workload || 0) + ((otherScheduleWorkload._sum?.workload) || 0);
      const totalWorkload = existingWorkload + workloadValue;

      if (totalWorkload > 100) {
        return NextResponse.json(
          { 
            error: `User workload would exceed 100%. Current workload: ${existingWorkload}%, requested: ${workloadValue}%, total: ${totalWorkload}%` 
          },
          { status: 400 }
        );
      }
    }

    // Update the team member
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (workload !== undefined) updateData.workload = parseFloat(workload);
    if (is_lead !== undefined) updateData.is_lead = is_lead;

    const updatedTeamMember = await prisma.scheduleTeamMember.update({
      where: { team_member_id: parseInt(teamMemberId) },
      data: updateData,
      include: {
        user: {
          include: {
            account: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTeamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id]/team-members - Remove a team member from the schedule
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('team_member_id');

    if (!teamMemberId) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      );
    }

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Verify team member exists and belongs to this schedule
    const teamMember = await prisma.scheduleTeamMember.findFirst({
      where: {
        team_member_id: parseInt(teamMemberId),
        schedule_id: scheduleId,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    await prisma.scheduleTeamMember.delete({
      where: { team_member_id: parseInt(teamMemberId) },
    });

    return NextResponse.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
} 