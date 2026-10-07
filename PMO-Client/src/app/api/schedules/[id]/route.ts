import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id] - Get a specific schedule with all details
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

    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        // user_id: userId,
      },
      include: {
        creator: {
          include: {
            account: true,
          },
        },
        project: true,
        wbs_items: {
          include: {
            children: true,
            tasks: true,
            budget: true, // was budgets: true
            procurements: true,
          },
          orderBy: { level: 'asc' },
        },
        tasks: {
          include: {
            wbs: true,
            assignments: {
              include: {
                resource: true,
              },
            },
            budget: true, // was budgets: true
            risks: true,
            predecessors: {
              include: {
                predecessor: true,
              },
            },
            successors: {
              include: {
                successor: true,
              },
            },
            risk_mitigations: true,
          },
          orderBy: { start_date: 'asc' },
        },
        budgets: {
          include: {
            wbs: true,
            task: true,
          },
        },
        risks: {
          include: {
            task: true,
            owner: {
              include: {
                account: true,
              },
            },
            mitigations: {
              include: {
                task: true,
                assignee: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        team_members: {
          include: {
            user: {
              include: {
                account: true,
              },
            },
          },
        },
        procurements: {
          include: {
            wbs: true,
          },
        },
        sites: true,
        conflicts: {
          orderBy: { severity: 'desc' },
        },
        approvals: {
          include: {
            user: {
              include: { account: true, role: true },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            risks: true,
            conflicts: true,
            wbs_items: true,
            budgets: true,
            team_members: true,
            procurements: true,
            sites: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Sum all planned_amounts for this schedule's budgets
    const totalBudget = Array.isArray(schedule.budgets)
      ? schedule.budgets.reduce((sum: number, b: any) => sum + (b.planned_amount || 0), 0)
      : 0;
    // Transform schedule to include computed fields for frontend
    const transformedSchedule = {
      ...schedule,
      total_tasks: schedule._count?.tasks ?? 0,
      total_budget: totalBudget,
      end_date: schedule.planned_end_date, // Map planned_end_date to end_date for frontend
      creator_user_id: schedule.creator?.user_id,
    };

    return NextResponse.json({ schedule: transformedSchedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update a schedule
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

    const body = await request.json();
    const {
      name,
      description,
      start_date,
      end_date,
      estimated_budget,
      priority,
      target_completion_date,
      notes,
      status,
    } = body;

    // Check if schedule exists and belongs to user
    const existingSchedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Validate dates if provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Validate budget if provided
    if (estimated_budget !== undefined && estimated_budget < 0) {
      return NextResponse.json(
        { error: 'Budget cannot be negative' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.planned_end_date = new Date(end_date);
    if (estimated_budget !== undefined) updateData.budget_amount = estimated_budget;
    if (priority !== undefined) {
      const p = priority.toLowerCase();
      updateData.priority = p === 'critical' ? 'high' : p as 'low' | 'medium' | 'high';
    }
    if (status !== undefined) updateData.status = status;

    const updatedSchedule = await prisma.projectSchedule.update({
      where: { schedule_id: scheduleId },
      data: updateData,
      include: {
        creator: {
          include: {
            account: true,
          },
        },
        project: true,
        _count: {
          select: {
            tasks: true,
            risks: true,
            conflicts: true,
          },
        },
      },
    });

    // Transform schedule to include computed fields for frontend
    const transformedSchedule = {
      ...updatedSchedule,
      total_tasks: updatedSchedule._count?.tasks ?? 0,
      total_budget: updatedSchedule.budget_amount,
      end_date: updatedSchedule.planned_end_date, // Map planned_end_date to end_date for frontend
    };

    return NextResponse.json({ schedule: transformedSchedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
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

    // Check if schedule exists and belongs to user
    const existingSchedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Prevent deletion if schedule is already converted to a project
    if (existingSchedule.status === 'converted') {
      return NextResponse.json(
        { error: 'Cannot delete a schedule that has been converted to a project' },
        { status: 400 }
      );
    }

    // Perform cascading deletes in the correct order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Get all task IDs for this schedule
      const tasks = await tx.scheduleTask.findMany({
        where: { schedule_id: scheduleId },
        select: { task_id: true }
      });
      const taskIds = tasks.map(t => t.task_id);

      // 2. Get all risk IDs for this schedule
      const risks = await tx.scheduleRisk.findMany({
        where: { schedule_id: scheduleId },
        select: { risk_id: true }
      });
      const riskIds = risks.map(r => r.risk_id);

      // 3. Delete all schedule risk mitigations first (they reference risks)
      if (riskIds.length > 0) {
        await tx.scheduleRiskMitigation.deleteMany({
          where: { risk_id: { in: riskIds } }
        });
      }

      // 4. Delete all schedule risks
      await tx.scheduleRisk.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 5. Delete all schedule task assignments (team members)
      if (taskIds.length > 0) {
        await tx.scheduleTaskAssignment.deleteMany({
          where: { task_id: { in: taskIds } }
        });
      }

      // 6. Delete all schedule assignments (resources)
      if (taskIds.length > 0) {
        await tx.scheduleAssignment.deleteMany({
          where: { task_id: { in: taskIds } }
        });
      }

      // 7. Delete all schedule task dependencies
      if (taskIds.length > 0) {
        await tx.scheduleTaskDependency.deleteMany({
          where: {
            OR: [
              { predecessor_task_id: { in: taskIds } },
              { successor_task_id: { in: taskIds } }
            ]
          }
        });
      }

      // 8. Delete all schedule budgets
      await tx.scheduleBudget.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 9. Delete all schedule procurements
      await tx.scheduleProcurement.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 10. Delete all schedule sites
      await tx.scheduleSite.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 11. Delete all schedule conflicts
      await tx.scheduleConflict.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 12. Delete all schedule approvals
      await tx.scheduleApproval.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 13. Delete all schedule team members
      await tx.scheduleTeamMember.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 14. Delete all schedule tasks
      await tx.scheduleTask.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 15. Delete all schedule WBS items
      await tx.scheduleWBS.deleteMany({
        where: { schedule_id: scheduleId }
      });

      // 16. Finally, delete the schedule itself
      await tx.projectSchedule.delete({
        where: { schedule_id: scheduleId }
      });
    });

    return NextResponse.json({ message: 'Schedule and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
} 