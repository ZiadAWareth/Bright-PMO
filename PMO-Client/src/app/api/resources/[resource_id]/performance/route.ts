import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/resources/{resource_id}/performance:
 *   get:
 *     summary: Get resource performance metrics
 *     description: Retrieves performance analytics for a specific resource
 *     tags:
 *       - Resources
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         description: ID of the resource
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resource performance data retrieved successfully
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ resource_id: string }> }
) {
  try {
    const { userId } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { resource_id } = resolvedParams;

    // First check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { resource_id: Number(resource_id) },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Get assignments and their performance data
    const assignments = await prisma.resourceAssignment.findMany({
      where: { resource_id: Number(resource_id) },
      include: {
        task: {
          include: {
            wbs: {
              include: {
                project: {
                  select: {
                    project_id: true,
                    name: true,
                    status: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get time entries for the resource using user assignments
    // Note: We need to find a way to link resources to users
    // For now, we'll get time entries from tasks that have this resource assigned
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        task: {
          resourceAssignments: {
            some: {
              resource_id: Number(resource_id)
            }
          }
        }
      },
      include: {
        task: {
          include: {
            wbs: {
              include: {
                project: {
                  select: {
                    name: true,
                    status: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 50 // Limit to recent entries for performance
    });

    // Calculate performance metrics
    const totalPlannedHours = assignments.reduce((sum, a) => sum + a.planned_hours, 0);
    const totalActualHours = assignments.reduce((sum, a) => sum + a.actual_hours, 0);
    const totalTimeEntries = timeEntries.reduce((sum, te) => sum + te.hours_spent, 0);
    
    const efficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;
    const utilization = resource.capacity > 0 ? (totalTimeEntries / (resource.capacity * 4)) * 100 : 0; // Assuming monthly view
    
    // Calculate on-time completion rate
    const completedTasks = assignments.filter(a => a.task.status === 'completed');
    const onTimeCompletions = completedTasks.filter(a => {
      if (a.task.actual_end_date && a.end_date) {
        return new Date(a.task.actual_end_date) <= new Date(a.end_date);
      }
      return false;
    });
    const onTimeRate = completedTasks.length > 0 ? (onTimeCompletions.length / completedTasks.length) * 100 : 0;

    // Project performance breakdown
    const projectPerformance = assignments.reduce((acc, assignment) => {
      const projectId = assignment.task.wbs.project.project_id;
      const projectName = assignment.task.wbs.project.name;
      
      if (!acc[projectId]) {
        acc[projectId] = {
          project_id: projectId,
          project_name: projectName,
          project_status: assignment.task.wbs.project.status,
          total_planned_hours: 0,
          total_actual_hours: 0,
          progress: 0,
          tasks_count: 0,
          completed_tasks: 0,
        };
      }
      
      acc[projectId].total_planned_hours += assignment.planned_hours;
      acc[projectId].total_actual_hours += assignment.actual_hours;
      acc[projectId].progress += assignment.progress;
      acc[projectId].tasks_count += 1;
      
      if (assignment.task.status === 'completed') {
        acc[projectId].completed_tasks += 1;
      }
      
      return acc;
    }, {} as Record<number, any>);

    // Convert to array and calculate averages
    const projectPerformanceArray = Object.values(projectPerformance).map((project: any) => ({
      ...project,
      average_progress: project.tasks_count > 0 ? project.progress / project.tasks_count : 0,
      completion_rate: project.tasks_count > 0 ? (project.completed_tasks / project.tasks_count) * 100 : 0,
      efficiency: project.total_planned_hours > 0 ? (project.total_actual_hours / project.total_planned_hours) * 100 : 0,
    }));

    // Recent time entries for activity tracking
    const recentTimeEntries = timeEntries.slice(0, 10).map(entry => ({
      date: entry.date,
      hours: entry.hours_spent,
      description: entry.description,
      task_name: entry.task.name,
      project_name: entry.task.wbs.project.name,
      created_at: entry.created_at,
    }));

    return NextResponse.json({
      resource_id: Number(resource_id),
      performance_metrics: {
        overall_rating: resource.rating,
        efficiency_rate: Math.round(efficiency * 100) / 100,
        utilization_rate: Math.round(utilization * 100) / 100,
        on_time_completion_rate: Math.round(onTimeRate * 100) / 100,
        total_planned_hours: totalPlannedHours,
        total_actual_hours: totalActualHours,
        total_time_logged: totalTimeEntries,
      },
      project_performance: projectPerformanceArray,
      recent_activity: recentTimeEntries,
      summary: {
        total_projects: projectPerformanceArray.length,
        active_projects: projectPerformanceArray.filter(p => p.project_status === 'execution').length,
        completed_projects: projectPerformanceArray.filter(p => p.project_status === 'completed').length,
        average_project_completion: projectPerformanceArray.length > 0 
          ? projectPerformanceArray.reduce((sum, p) => sum + p.completion_rate, 0) / projectPerformanceArray.length 
          : 0,
      }
    });

  } catch (error) {
    console.error("Error fetching resource performance:", error);
    return NextResponse.json({ error: "Failed to fetch resource performance" }, { status: 500 });
  }
}
