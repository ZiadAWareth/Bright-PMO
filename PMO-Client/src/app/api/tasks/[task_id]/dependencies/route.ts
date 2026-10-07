import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorkflowTriggerService } from '@/lib/services/workflow-trigger.service';
import { DependencyType } from '@prisma/client';

/**
 * @swagger
 * /api/tasks/{task_id}/dependencies:
 *   get:
 *     summary: Get task dependencies
 *     description: Retrieves all dependencies for a specific task
 *     tags:
 *       - Tasks
 *       - Dependencies
 *     parameters:
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
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const taskId = parseInt(task_id);

    console.log('\n=== DEPENDENCY FETCH DEBUG ===');
    console.log('📖 Fetching dependencies for Task ID:', taskId);

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      console.log('❌ Task not found');
      console.log('=== END DEPENDENCY FETCH DEBUG ===\n');
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    console.log('✅ Task found:', task.name);

    // Get all dependencies where this task is either predecessor or successor
    const dependencies = await prisma.taskDependency.findMany({
      where: {
        OR: [
          { predecessor_task_id: taskId },
          { successor_task_id: taskId },
        ],
      },
      include: {
        predecessor: true,
        successor: true,
      },
    });

    console.log('📊 Found', dependencies.length, 'dependencies:');
    dependencies.forEach(dep => {
      console.log('   -', dep.dependency_type, ':');
      console.log('     Predecessor:', dep.predecessor.name, '(ID:', dep.predecessor_task_id, ')');
      console.log('     Successor:', dep.successor.name, '(ID:', dep.successor_task_id, ')');
    });
    console.log('=== END DEPENDENCY FETCH DEBUG ===\n');

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
 * /api/tasks/{task_id}/dependencies:
 *   post:
 *     summary: Create a task dependency
 *     description: Creates a new dependency for a task and triggers any associated workflow rules
 *     tags:
 *       - Tasks
 *       - Dependencies
 *     parameters:
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
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const taskId = parseInt(task_id);
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

    // 🔍 DEBUG: Log dependency creation attempt
    console.log('\n=== DEPENDENCY CREATION DEBUG ===');
    console.log('📝 Creating dependency:');
    console.log('   Successor Task ID (depends on):', taskId);
    console.log('   Predecessor Task ID (must finish first):', predecessor_task_id);
    console.log('   Dependency Type:', dependency_type);
    console.log('   Lag Time:', lag_time);

    // Prevent self-dependencies
    if (taskId === predecessor_task_id) {
      console.log('❌ ERROR: Self-dependency detected!');
      console.log('=== END DEPENDENCY CREATION DEBUG ===\n');
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Check if both tasks exist and get their details
    const [task, predecessor] = await Promise.all([
      prisma.task.findUnique({ 
        where: { task_id: taskId },
        include: {
          assigned_users: {
            include: {
              user: true
            }
          },
          creator: true
        }
      }),
      prisma.task.findUnique({ 
        where: { task_id: predecessor_task_id },
        include: {
          assigned_users: {
            include: {
              user: true
            }
          },
          creator: true
        }
      }),
    ]);

    if (!task || !predecessor) {
      console.log('❌ ERROR: Task not found!');
      console.log('   Task exists:', !!task);
      console.log('   Predecessor exists:', !!predecessor);
      console.log('=== END DEPENDENCY CREATION DEBUG ===\n');
      return NextResponse.json(
        { error: 'Task or predecessor task not found' },
        { status: 404 }
      );
    }

    console.log('✅ Both tasks found:');
    console.log('   Successor:', task.name, '(ID:', task.task_id, ')');
    console.log('   Predecessor:', predecessor.name, '(ID:', predecessor.task_id, ')');

    // Check if dependency already exists
    const existingDependency = await prisma.taskDependency.findFirst({
      where: {
        predecessor_task_id,
        successor_task_id: taskId
      }
    });

    if (existingDependency) {
      console.log('⚠️  DEPENDENCY ALREADY EXISTS!');
      console.log('   Existing Dependency ID:', existingDependency.dependency_id);
      console.log('   Type:', existingDependency.dependency_type);
      console.log('=== END DEPENDENCY CREATION DEBUG ===\n');
      return NextResponse.json(
        { error: 'Dependency already exists between these tasks', dependency: existingDependency },
        { status: 400 }
      );
    }

    console.log('💾 Creating new dependency in database...');

    // Create the dependency
    const dependency = await prisma.taskDependency.create({
      data: {
        predecessor_task_id,
        successor_task_id: taskId,
        dependency_type,
        lag_time,
      },
      include: {
        predecessor: true,
        successor: true,
      },
    });

    console.log('✅ DEPENDENCY CREATED SUCCESSFULLY!');
    console.log('   Dependency ID:', dependency.dependency_id);
    console.log('   Predecessor Task ID:', dependency.predecessor_task_id);
    console.log('   Successor Task ID:', dependency.successor_task_id);
    console.log('   Type:', dependency.dependency_type);
    console.log('   Lag Time:', dependency.lag_time);
    console.log('=== END DEPENDENCY CREATION DEBUG ===\n');

    // Check if predecessor is completed and trigger workflow rules
    if (predecessor.status === 'completed') {
      await WorkflowTriggerService.processDependencyCompletion(predecessor_task_id);
    }

    // Create notifications for all relevant users
    const notificationPromises = [];

    // Notify successor task's assigned users
    if (task.assigned_users) {
      for (const assignment of task.assigned_users) {
        notificationPromises.push(
          prisma.notification.create({
            data: {
              user_id: assignment.user_id,
              type: "TASK_UPDATE",
              title: "New Task Dependency",
              message: `Task "${task.name}" now depends on "${predecessor.name}"`,
              priority: "MEDIUM",
              created_by_id: 1, // System user
              metadata: {
                task_id: taskId,
                predecessor_task_id: predecessor_task_id,
                dependency_type: dependency_type,
                dependency_id: dependency.dependency_id
              }
            }
          })
        );
      }
    }

    // Notify predecessor task's assigned users
    if (predecessor.assigned_users) {
      for (const assignment of predecessor.assigned_users) {
        notificationPromises.push(
          prisma.notification.create({
            data: {
              user_id: assignment.user_id,
              type: "TASK_UPDATE",
              title: "New Task Dependency",
              message: `Task "${predecessor.name}" is now a dependency for "${task.name}"`,
              priority: "MEDIUM",
              created_by_id: 1, // System user
              metadata: {
                task_id: predecessor_task_id,
                successor_task_id: taskId,
                dependency_type: dependency_type,
                dependency_id: dependency.dependency_id
              }
            }
          })
        );

      }
    }

    // Notify task creators if they're not already in the assigned users list
    const notifyTaskCreator = !task.assigned_users?.some(
      assignment => assignment.user_id === task.created_by
    );
    const notifyPredecessorCreator = !predecessor.assigned_users?.some(
      assignment => assignment.user_id === predecessor.created_by
    );

    // Check if the same user is creator of both tasks
    const isSameCreator = task.created_by === predecessor.created_by;

    if (notifyTaskCreator) {
      notificationPromises.push(
        prisma.notification.create({
          data: {
            user_id: task.created_by,
            type: "TASK_UPDATE",
            title: "New Task Dependency",
            message: isSameCreator 
              ? `You created a dependency between your tasks "${task.name}" and "${predecessor.name}"`
              : `Task "${task.name}" now depends on "${predecessor.name}"`,
            priority: "MEDIUM",
            created_by_id: 1, // System user
            metadata: {
              task_id: taskId,
              predecessor_task_id: predecessor_task_id,
              dependency_type: dependency_type,
              dependency_id: dependency.dependency_id
            }
          }
        })
      );
    }

    // Only notify predecessor creator if they're different from task creator
    if (notifyPredecessorCreator && !isSameCreator) {
      notificationPromises.push(
        prisma.notification.create({
          data: {
            user_id: predecessor.created_by,
            type: "TASK_UPDATE",
            title: "New Task Dependency",
            message: `Task "${predecessor.name}" is now a dependency for "${task.name}"`,
            priority: "MEDIUM",
            created_by_id: 1, // System user
            metadata: {
              task_id: predecessor_task_id,
              successor_task_id: taskId,
              dependency_type: dependency_type,
              dependency_id: dependency.dependency_id
            }
          }
        })
      );
    }

    // Send all notifications
    await Promise.all(notificationPromises);

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create dependency: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}/dependencies/{dependency_id}:
 *   delete:
 *     summary: Delete a task dependency
 *     description: Deletes a specific dependency for a task
 *     tags:
 *       - Tasks
 *       - Dependencies
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task
 *         schema:
 *           type: integer
 *       - in: path
 *         name: dependency_id
 *         required: true
 *         description: ID of the dependency to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dependency deleted successfully
 *       404:
 *         description: Dependency not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ task_id: string; dependency_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id, dependency_id } = resolvedParams;
    const taskId = parseInt(task_id);
    const dependencyId = parseInt(dependency_id);
    // Check if dependency exists and belongs to the task
    const dependency = await prisma.taskDependency.findFirst({
      where: {
        dependency_id: dependencyId,
        OR: [
          { predecessor_task_id: taskId },
          { successor_task_id: taskId },
        ],
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    // Delete the dependency
    await prisma.taskDependency.delete({
      where: { dependency_id: dependencyId },
    });

    return NextResponse.json({ message: 'Dependency deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete dependency: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 