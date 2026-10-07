import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/workload
 * Returns workload summary for all users (or for given user_ids) in one call.
 * Query: start_date, end_date (optional), user_ids (optional comma-separated).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : new Date();
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const userIdsParam = searchParams.get('user_ids');
    const userIds = userIdsParam
      ? userIdsParam.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : null;

    const workingHoursPerWeek = 40;
    const weeksInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const totalCapacityHours = workingHoursPerWeek * weeksInPeriod;

    // The seeded SYSTEM account is not a person: it cannot sign in and cannot
    // be assigned work, so it is left out when browsing for users. An explicit
    // user_ids lookup still resolves it, since that caller already knows which
    // record it wants.
    //
    // User itself is filtered directly on its own role relation; the other
    // three models don't have a `role` field, so they're filtered by walking
    // through their `user` relation instead.
    const userWhere = userIds && userIds.length > 0
      ? { user_id: { in: userIds } }
      : { role: { name: { not: 'SYSTEM' } } };
    const byUserWhere = userIds && userIds.length > 0
      ? { user_id: { in: userIds } }
      : { user: { role: { name: { not: 'SYSTEM' } } } };

    const [users, projectTeamMembers, taskAssignments, timeEntries] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        include: {
          account: { select: { first_name: true, last_name: true, department: true } },
          role: { select: { name: true } },
        },
      }),
      prisma.projectTeamMember.findMany({
        where: byUserWhere,
        include: {
          project: { select: { project_id: true, status: true } },
        },
      }),
      prisma.taskAssignment.findMany({
        where: byUserWhere,
        include: {
          task: {
            select: {
              task_id: true,
              status: true,
              estimated_hours: true,
              actual_hours: true,
              wbs: { select: { project_id: true } },
            },
          },
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          ...byUserWhere,
          date: { gte: startDate, lte: endDate },
        },
        select: { user_id: true, hours_spent: true },
      }),
    ]);

    const ptmByUser = new Map<number, typeof projectTeamMembers>();
    for (const pm of projectTeamMembers) {
      if (!ptmByUser.has(pm.user_id)) ptmByUser.set(pm.user_id, []);
      ptmByUser.get(pm.user_id)!.push(pm);
    }
    const taByUser = new Map<number, typeof taskAssignments>();
    for (const ta of taskAssignments) {
      if (!taByUser.has(ta.user_id)) taByUser.set(ta.user_id, []);
      taByUser.get(ta.user_id)!.push(ta);
    }
    const timeByUser = new Map<number, number>();
    for (const te of timeEntries) {
      timeByUser.set(te.user_id, (timeByUser.get(te.user_id) || 0) + (te.hours_spent || 0));
    }

    const summaries = users.map((user) => {
      const ptm = ptmByUser.get(user.user_id) || [];
      const ta = taByUser.get(user.user_id) || [];
      const activeProjects = ptm.filter(
        (p) => p.project.status === 'execution' || p.project.status === 'planning'
      );
      const activeTasks = ta.filter(
        (a) => a.task.status === 'in_progress' || a.task.status === 'todo'
      );
      const totalHoursAllocated = ta.reduce((s, a) => s + (a.task.estimated_hours || 0), 0);
      const totalHoursLogged = ta.reduce((s, a) => s + (a.task.actual_hours || 0), 0);
      const fromTimeEntries = timeByUser.get(user.user_id) || 0;
      const totalActualHours = Math.max(totalHoursLogged, fromTimeEntries);
      const utilizationPercentage =
        totalCapacityHours > 0 ? (totalHoursAllocated / totalCapacityHours) * 100 : 0;

      let capacityStatus = 'available';
      if (utilizationPercentage > 100) capacityStatus = 'overloaded';
      else if (utilizationPercentage >= 80) capacityStatus = 'optimal';
      else if (utilizationPercentage >= 50) capacityStatus = 'under_utilized';

      const name =
        `${user.account?.first_name || ''} ${user.account?.last_name || ''}`.trim() || user.username;

      return {
        user_id: user.user_id,
        name,
        email: user.email,
        department: user.account?.department || 'N/A',
        role: user.role?.name || 'N/A',
        status: user.status,
        total_projects: ptm.length,
        active_tasks: activeTasks.length,
        total_hours_allocated: Math.round(totalHoursAllocated * 10) / 10,
        total_hours_logged: Math.round(totalActualHours * 10) / 10,
        utilization_percentage: Math.round(utilizationPercentage * 10) / 10,
        capacity_status: capacityStatus,
      };
    });

    return NextResponse.json(summaries, { status: 200 });
  } catch (error) {
    console.error('Error fetching batch user workload:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user workload', details: String(error) },
      { status: 500 }
    );
  }
}
