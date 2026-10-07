import { NextResponse } from 'next/server';
import { checkTaskDependencies, canAccessLockedTask } from '@/lib/task-dependency-utils';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/tasks/{task_id}/dependency-status:
 *   get:
 *     summary: Check task dependency status
 *     description: Checks if a task is locked due to unmet dependencies and whether the current user can access it
 *     tags:
 *       - Tasks
 *       - Dependencies
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to check
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dependency status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isLocked:
 *                   type: boolean
 *                   description: Whether the task is locked due to dependencies
 *                 canAccess:
 *                   type: boolean
 *                   description: Whether the current user can access the locked task
 *                 reasons:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Reasons why the task is locked
 *                 incompleteDependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dependency_id:
 *                         type: integer
 *                       predecessor_task_id:
 *                         type: integer
 *                       dependency_type:
 *                         type: string
 *                       predecessor:
 *                         type: object
 *                         properties:
 *                           task_id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                           progress_percentage:
 *                             type: number
 *                           end_date:
 *                             type: string
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

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Get current user information
    const { userId, role } = await getUserFromHeaders();

    // Check task dependencies
    const dependencyStatus = await checkTaskDependencies(taskId);
    
    // Check if user can access locked tasks
    const canAccess = canAccessLockedTask(role);

    const response = {
      isLocked: dependencyStatus.isLocked,
      canAccess: canAccess,
      reasons: dependencyStatus.reasons,
      incompleteDependencies: dependencyStatus.incompleteDependencies
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking task dependency status:', error);
    return NextResponse.json(
      { error: 'Failed to check task dependency status: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
