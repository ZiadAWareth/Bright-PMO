import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { user_id } = resolvedParams;
    const userId = parseInt(user_id);

    // Fetch user with account info
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        account: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : new Date();
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from start

    // 1. Get all projects the user is assigned to
    const projectTeamMembers = await prisma.projectTeamMember.findMany({
      where: { user_id: userId },
      include: {
        project: {
          select: {
            project_id: true,
            name: true,
            status: true,
            start_date: true,
            planned_end_date: true,
            actual_end_date: true,
            progress_percentage: true,
          },
        },
      },
    });

    // 2. Get all tasks assigned to the user
    const taskAssignments = await prisma.taskAssignment.findMany({
      where: { user_id: userId },
      include: {
        task: {
          select: {
            task_id: true,
            name: true,
            status: true,
            start_date: true,
            end_date: true,
            estimated_hours: true,
            actual_hours: true,
            progress_percentage: true,
            wbs: {
              select: {
                project_id: true,
              },
            },
          },
        },
      },
    });

    // 3. Get time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: {
          select: {
            project_id: true,
            name: true,
          },
        },
        task: {
          select: {
            task_id: true,
            name: true,
          },
        },
      },
    });

    // 4. Get timesheets
    const timesheets = await prisma.timesheet.findMany({
      where: {
        user_id: userId,
        start_date: {
          gte: startDate,
        },
        end_date: {
          lte: endDate,
        },
      },
    });

    // Calculate metrics
    const activeProjects = projectTeamMembers.filter(
      (pm) => pm.project.status === 'execution' || pm.project.status === 'planning'
    );

    const activeTasks = taskAssignments.filter(
      (ta) =>
        ta.task.status === 'in_progress' ||
        ta.task.status === 'todo'
    );

    const completedTasks = taskAssignments.filter(
      (ta) => ta.task.status === 'completed'
    );

    // Calculate total hours allocated (from tasks)
    const totalHoursAllocated = taskAssignments.reduce((sum, ta) => {
      return sum + (ta.task.estimated_hours || 0);
    }, 0);

    // Calculate total hours logged (from time entries)
    const totalHoursLogged = timeEntries.reduce((sum, te) => {
      return sum + (te.hours_spent || 0);
    }, 0);

    // Calculate actual hours from tasks
    const actualHoursFromTasks = taskAssignments.reduce((sum, ta) => {
      return sum + (ta.task.actual_hours || 0);
    }, 0);

    // Use the higher of time entries or task actual hours
    const totalActualHours = Math.max(totalHoursLogged, actualHoursFromTasks);

    // Standard working hours per week (40 hours) for capacity calculation
    const workingHoursPerWeek = 40;
    const weeksInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const totalCapacityHours = workingHoursPerWeek * weeksInPeriod;

    // Calculate utilization percentage
    const utilizationPercentage =
      totalCapacityHours > 0
        ? (totalHoursAllocated / totalCapacityHours) * 100
        : 0;

    // Determine capacity status (based on Primavera/MS Project best practices)
    let capacityStatus = 'available';
    if (utilizationPercentage > 100) {
      capacityStatus = 'overloaded'; // Over-allocated
    } else if (utilizationPercentage >= 80) {
      capacityStatus = 'optimal'; // Optimal utilization (80-100%)
    } else if (utilizationPercentage >= 50) {
      capacityStatus = 'under_utilized'; // Under-utilized (50-79%)
    } else {
      capacityStatus = 'available'; // Available (<50%)
    }

    // Calculate project breakdown
    const projectBreakdown = projectTeamMembers.map((pm) => {
      const projectTasks = taskAssignments.filter(
        (ta) => ta.task.wbs.project_id === pm.project_id
      );
      const projectHours = projectTasks.reduce(
        (sum, ta) => sum + (ta.task.estimated_hours || 0),
        0
      );
      const projectActualHours = projectTasks.reduce(
        (sum, ta) => sum + (ta.task.actual_hours || 0),
        0
      );

      return {
        project_id: pm.project.project_id,
        project_name: pm.project.name,
        project_status: pm.project.status,
        role: pm.role,
        is_lead: pm.is_lead,
        task_count: projectTasks.length,
        active_tasks: projectTasks.filter(
          (ta) =>
            ta.task.status === 'in_progress' ||
            ta.task.status === 'todo'
        ).length,
        completed_tasks: projectTasks.filter(
          (ta) => ta.task.status === 'completed'
        ).length,
        estimated_hours: projectHours,
        actual_hours: projectActualHours,
        progress: pm.project.progress_percentage,
      };
    });

    // Calculate task breakdown by status
    const taskBreakdown = {
      todo: activeTasks.filter((ta) => ta.task.status === 'todo').length,
      in_progress: activeTasks.filter((ta) => ta.task.status === 'in_progress')
        .length,
      completed: completedTasks.length,
      total: taskAssignments.length,
    };

    // Weekly time distribution
    const weeklyTimeDistribution = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekEntries = timeEntries.filter((te) => {
        const teDate = new Date(te.date);
        return teDate >= weekStart && teDate < weekEnd;
      });

      const weekHours = weekEntries.reduce((sum, te) => sum + te.hours_spent, 0);

      weeklyTimeDistribution.push({
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        hours: weekHours,
        entries_count: weekEntries.length,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Upcoming tasks (next 2 weeks)
    const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const upcomingTasks = taskAssignments
      .filter((ta) => {
        const taskStart = ta.task.start_date ? new Date(ta.task.start_date) : null;
        return (
          taskStart &&
          taskStart <= twoWeeksFromNow &&
          (ta.task.status === 'todo' ||
            ta.task.status === 'in_progress')
        );
      })
      .map((ta) => ({
        task_id: ta.task.task_id,
        task_name: ta.task.name,
        project_id: ta.task.wbs.project_id,
        status: ta.task.status,
        start_date: ta.task.start_date,
        end_date: ta.task.end_date,
        estimated_hours: ta.task.estimated_hours,
        progress: ta.task.progress_percentage,
      }))
      .sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateA - dateB;
      });

    // Overdue tasks
    const now = new Date();
    const overdueTasks = taskAssignments
      .filter((ta) => {
        const taskEnd = ta.task.end_date ? new Date(ta.task.end_date) : null;
        return (
          taskEnd &&
          taskEnd < now &&
          (ta.task.status === 'todo' ||
            ta.task.status === 'in_progress')
        );
      })
      .map((ta) => ({
        task_id: ta.task.task_id,
        task_name: ta.task.name,
        status: ta.task.status,
        end_date: ta.task.end_date,
        days_overdue: Math.floor(
          (now.getTime() - new Date(ta.task.end_date!).getTime()) /
            (24 * 60 * 60 * 1000)
        ),
      }));

    // Build response
    const response = {
      user_id: userId,
      name: `${user.account?.first_name || ''} ${user.account?.last_name || ''}`.trim() || user.username,
      email: user.email,
      department: user.account?.department || 'N/A',
      role: user.role?.name || 'N/A',
      status: user.status,

      // Summary metrics
      total_projects: projectTeamMembers.length,
      active_projects: activeProjects.length,
      completed_projects:
        projectTeamMembers.length - activeProjects.length,

      total_tasks: taskAssignments.length,
      active_tasks: activeTasks.length,
      completed_tasks: completedTasks.length,
      overdue_tasks_count: overdueTasks.length,

      // Hours and capacity
      total_hours_allocated: Math.round(totalHoursAllocated * 10) / 10,
      total_hours_logged: Math.round(totalActualHours * 10) / 10,
      total_capacity_hours: totalCapacityHours,
      available_hours: Math.max(0, totalCapacityHours - totalHoursAllocated),

      utilization_percentage: Math.round(utilizationPercentage * 10) / 10,
      capacity_status: capacityStatus,

      // Detailed breakdowns
      project_breakdown: projectBreakdown,
      task_breakdown: taskBreakdown,
      upcoming_tasks: upcomingTasks.slice(0, 10), // Limit to 10
      overdue_tasks_list: overdueTasks,
      weekly_time_distribution: weeklyTimeDistribution.slice(0, 12), // Limit to 12 weeks

      // Period info
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        weeks: weeksInPeriod,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error calculating user workload:', error);
    return NextResponse.json(
      { error: 'Failed to calculate workload', details: String(error) },
      { status: 500 }
    );
  }
}
