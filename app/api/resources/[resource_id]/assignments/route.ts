import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/resources/{resource_id}/assignments:
 *   get:
 *     summary: Get resource assignments
 *     description: Retrieves all assignments for a specific resource
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
 *         description: Resource assignments retrieved successfully
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

    // Get all assignments for the resource
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
                    project_code: true,
                    start_date: true,
                    planned_end_date: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        start_date: 'desc'
      }
    });

    // Transform the data for the frontend
    const transformedAssignments = assignments.map(assignment => ({
      assignment_id: assignment.assignment_id,
      project_id: assignment.task.wbs.project.project_id,
      project_name: assignment.task.wbs.project.name,
      project_code: assignment.task.wbs.project.project_code,
      project_status: assignment.task.wbs.project.status,
      task_id: assignment.task_id,
      task_name: assignment.task.name,
      task_description: assignment.task.description,
      role: assignment.task.name, // Using task name as role for now
      allocation_percentage: assignment.allocation_percentage,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      progress: assignment.progress,
      planned_hours: assignment.planned_hours,
      actual_hours: assignment.actual_hours,
      task_status: assignment.task.status,
      task_priority: assignment.task.priority,
      project_start_date: assignment.task.wbs.project.start_date,
      project_end_date: assignment.task.wbs.project.planned_end_date,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
    }));

    return NextResponse.json({
      resource_id: Number(resource_id),
      assignments: transformedAssignments,
      summary: {
        total_assignments: assignments.length,
        active_assignments: assignments.filter(a => a.task.status === 'in_progress').length,
        completed_assignments: assignments.filter(a => a.task.status === 'completed').length,
        total_planned_hours: assignments.reduce((sum, a) => sum + a.planned_hours, 0),
        total_actual_hours: assignments.reduce((sum, a) => sum + a.actual_hours, 0),
        current_projects: [...new Set(assignments.map(a => a.task.wbs.project.project_id))].length,
      }
    });

  } catch (error) {
    console.error("Error fetching resource assignments:", error);
    return NextResponse.json({ error: "Failed to fetch resource assignments" }, { status: 500 });
  }
}
