import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/projects/{id}/tasks:
 *   get:
 *     summary: Get all tasks for a specific project
 *     description: Retrieves all tasks associated with a project through its WBS structure
 *     tags:
 *       - Projects
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The project ID
 *     responses:
 *       200:
 *         description: A list of tasks for the project
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   task_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                   progress_percentage:
 *                     type: number
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await getUserFromHeaders();
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const isFullAccess =
      role === "ADMIN" || role === "PJM" || role === "PMO" || role === "FIN";

    // Check if project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        project_id: projectId,
        ...(isFullAccess ? {} : {
          OR: [
            { created_by: userId },
            {
              assignments: {
                some: { userId: userId }
              }
            }
          ]
        })
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // All tasks for this project (user already passed project access)
    const tasks = await prisma.task.findMany({
      where: {
        wbs: {
          project_id: projectId
        }
      },
      include: {
        wbs: {
          select: {
            wbs_id: true,
            name: true,
            wbs_code: true,
            level: true,
          }
        },
        assigned_users: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                email: true
              }
            }
          }
        },
        resourceAssignments: true,
        budgets: true,
        documents: true,
        predecessor_dependencies: true,
        successor_dependencies: true,
      },
      orderBy: [
        { wbs: { wbs_code: 'asc' } },
        { task_id: 'asc' }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch project tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch project tasks: " + (error as Error).message },
      { status: 500 }
    );
  }
}
