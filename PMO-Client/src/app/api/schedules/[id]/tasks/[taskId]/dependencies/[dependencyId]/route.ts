import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/schedules/{schedule_id}/tasks/{task_id}/dependencies/{dependency_id}:
 *   delete:
 *     summary: Delete a schedule task dependency
 *     description: Removes a specific dependency between schedule tasks
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
  context: { params: Promise<{ id: string; taskId: string; dependencyId: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id: scheduleId, taskId, dependencyId } = resolvedParams;
    const taskIdNum = parseInt(taskId);
    const scheduleIdNum = parseInt(scheduleId);
    const dependencyIdNum = parseInt(dependencyId);

    // Check if dependency exists and belongs to the task in this schedule
    const dependency = await prisma.scheduleTaskDependency.findFirst({
      where: {
        dependency_id: dependencyIdNum,
        OR: [
          { 
            predecessor_task_id: taskIdNum,
            predecessor: {
              schedule_id: scheduleIdNum
            }
          },
          { 
            successor_task_id: taskIdNum,
            successor: {
              schedule_id: scheduleIdNum
            }
          },
        ],
      },
      include: {
        predecessor: true,
        successor: true
      }
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    // Delete the dependency
    await prisma.scheduleTaskDependency.delete({
      where: {
        dependency_id: dependencyIdNum,
      },
    });

    return NextResponse.json(
      { message: 'Dependency deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete dependency: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 