import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CriticalPathService } from '@/lib/services/critical-path.service';

/**
 * @swagger
 * /api/taskDependencies:
 *   get:
 *     summary: Get all task dependencies
 *     description: Retrieves a list of all task dependencies with predecessor and successor task details
 *     tags:
 *       - Task Dependencies
 *     responses:
 *       200:
 *         description: List of task dependencies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   dependency_id:
 *                     type: integer
 *                   predecessor_task_id:
 *                     type: integer
 *                   successor_task_id:
 *                     type: integer
 *                   dependency_type:
 *                     type: string
 *                     enum: [FS, SS, FF, SF]
 *                     description: Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
 *                   lag_time:
 *                     type: integer
 *                     description: Lag time between tasks in days
 *                   predecessor:
 *                     type: object
 *                     description: Predecessor task details
 *                   successor:
 *                     type: object
 *                     description: Successor task details
 *       500:
 *         description: Server error
 */
// GET all Task Dependencies
export async function GET() {
  try {
    const dependencies = await prisma.taskDependency.findMany({
      include: {
        predecessor: true,
        successor: true,
      },
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch task dependencies: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/taskDependencies:
 *   post:
 *     summary: Create a new task dependency
 *     description: Creates a new dependency relationship between two tasks
 *     tags:
 *       - Task Dependencies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - predecessor_task_id
 *               - successor_task_id
 *               - dependency_type
 *             properties:
 *               predecessor_task_id:
 *                 type: integer
 *                 description: ID of the predecessor task
 *               successor_task_id:
 *                 type: integer
 *                 description: ID of the successor task
 *               dependency_type:
 *                 type: string
 *                 enum: [finish_to_start, start_to_start, finish_to_finish, start_to_finish]
 *                 description: Type of dependency (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish)
 *               lag_time:
 *                 type: integer
 *                 description: Lag time between tasks in days (defaults to 0)
 *     responses:
 *       201:
 *         description: Task dependency created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dependency_id:
 *                   type: integer
 *                 predecessor_task_id:
 *                   type: integer
 *                 successor_task_id:
 *                   type: integer
 *                 dependency_type:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
// POST new Task Dependency
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.predecessor_task_id || !data.successor_task_id || !data.dependency_type) {
      return NextResponse.json(
        { error: "Missing required fields: predecessor_task_id, successor_task_id, and dependency_type are required" },
        { status: 400 }
      );
    }

    // Prevent self-dependencies
    if (data.predecessor_task_id === data.successor_task_id) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    const newDependency = await prisma.taskDependency.create({
      data: {
        ...data,
        lag_time: data.lag_time || 0,
      },
      include: {
        predecessor: {
          include: {
            wbs: {
              select: {
                project_id: true
              }
            }
          }
        }
      }
    });

    // Trigger critical path recalculation for the project
    try {
      const projectId = newDependency.predecessor.wbs.project_id;
      await CriticalPathService.recalculateForProject(projectId);
      console.log(`Critical path recalculated for project ${projectId} after dependency creation`);
    } catch (cpmError) {
      console.error('Error recalculating critical path:', cpmError);
      // Don't fail the request if CPM calculation fails
    }

    return NextResponse.json(newDependency, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create task dependency: " + (error as Error).message },
      { status: 500 }
    );
  }
} 