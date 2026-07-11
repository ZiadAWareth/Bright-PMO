import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DependencyType } from '@prisma/client';

/**
 * @swagger
 * /api/schedules/{schedule_id}/tasks/{task_id}/dependencies:
 *   get:
 *     summary: Get schedule task dependencies
 *     description: Retrieves all dependencies for a specific schedule task
 *     tags:
 *       - Schedule Tasks
 *       - Dependencies
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the schedule
 *         schema:
 *           type: integer
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dependencies retrieved successfully
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
 *                     enum: [finish_to_start, start_to_start, finish_to_finish, start_to_finish]
 *                   lag_time:
 *                     type: integer
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id: scheduleId, taskId } = resolvedParams;
    const taskIdNum = parseInt(taskId);

    // Check if task exists and belongs to the schedule
    const task = await prisma.scheduleTask.findFirst({
      where: { 
        task_id: taskIdNum,
        schedule_id: parseInt(scheduleId)
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get all dependencies where this task is either predecessor or successor
    const dependencies = await prisma.scheduleTaskDependency.findMany({
      where: {
        OR: [
          { predecessor_task_id: taskIdNum },
          { successor_task_id: taskIdNum },
        ],
      },
      include: {
        predecessor: true,
        successor: true,
      },
    });

    return NextResponse.json(dependencies);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dependencies: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/schedules/{schedule_id}/tasks/{task_id}/dependencies:
 *   post:
 *     summary: Create a schedule task dependency
 *     description: Creates a new dependency for a schedule task
 *     tags:
 *       - Schedule Tasks
 *       - Dependencies
 *     parameters:
 *       - in: path
 *         name: schedule_id
 *         required: true
 *         description: ID of the schedule
 *         schema:
 *           type: integer
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - predecessor_task_id
 *               - dependency_type
 *             properties:
 *               predecessor_task_id:
 *                 type: integer
 *                 description: ID of the predecessor task
 *               dependency_type:
 *                 type: string
 *                 enum: [finish_to_start, start_to_start, finish_to_finish, start_to_finish]
 *                 description: Type of dependency
 *               lag_time:
 *                 type: integer
 *                 description: Lag time in days
 *     responses:
 *       201:
 *         description: Dependency created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id: scheduleId, taskId } = resolvedParams;
    const taskIdNum = parseInt(taskId);
    const scheduleIdNum = parseInt(scheduleId);
    const body = await request.json();
    const { predecessor_task_id, dependency_type, lag_time = 0 } = body;

    // Validate required fields
    if (!predecessor_task_id || !dependency_type) {
      return NextResponse.json(
        { error: 'Missing required fields: predecessor_task_id and dependency_type are required' },
        { status: 400 }
      );
    }

    // Validate dependency type
    if (!Object.values(DependencyType).includes(dependency_type)) {
      return NextResponse.json(
        { error: 'Invalid dependency type' },
        { status: 400 }
      );
    }

    // Prevent self-dependencies
    if (taskIdNum === predecessor_task_id) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Check if both tasks exist and belong to the same schedule
    const [task, predecessor] = await Promise.all([
      prisma.scheduleTask.findFirst({ 
        where: { 
          task_id: taskIdNum,
          schedule_id: scheduleIdNum
        },
        include: {
          user_assignments: {
            include: {
              user: true
            }
          }
        }
      }),
      prisma.scheduleTask.findFirst({ 
        where: { 
          task_id: predecessor_task_id,
          schedule_id: scheduleIdNum
        },
        include: {
          user_assignments: {
            include: {
              user: true
            }
          }
        }
      }),
    ]);

    if (!task || !predecessor) {
      return NextResponse.json(
        { error: 'Task or predecessor task not found in this schedule' },
        { status: 404 }
      );
    }

    // Check if dependency already exists
    const existingDependency = await prisma.scheduleTaskDependency.findFirst({
      where: {
        predecessor_task_id,
        successor_task_id: taskIdNum,
      },
    });

    if (existingDependency) {
      return NextResponse.json(
        { error: 'Dependency already exists between these tasks' },
        { status: 400 }
      );
    }

    // Create the dependency
    const dependency = await prisma.scheduleTaskDependency.create({
      data: {
        predecessor_task_id,
        successor_task_id: taskIdNum,
        dependency_type,
        lag_time,
      },
      include: {
        predecessor: true,
        successor: true,
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create dependency: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 