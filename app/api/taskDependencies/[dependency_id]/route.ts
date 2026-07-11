import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/taskDependencies/{dependency_id}:
 *   get:
 *     summary: Get a task dependency by ID
 *     description: Retrieves a specific task dependency by its ID with predecessor and successor task details
 *     tags:
 *       - Task Dependencies
 *     parameters:
 *       - in: path
 *         name: dependency_id
 *         required: true
 *         description: ID of the task dependency to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task dependency retrieved successfully
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
 *                 type: string
 *                 enum: [finish_to_start, start_to_start, finish_to_finish, start_to_finish]
 *                 lag_time:
 *                   type: integer
 *                 predecessor:
 *                   type: object
 *                   description: Predecessor task details
 *                 successor:
 *                   type: object
 *                   description: Successor task details
 *       404:
 *         description: Task dependency not found
 *       500:
 *         description: Server error
 */
// GET single Task Dependency by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ dependency_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { dependency_id } = resolvedParams;
    const dependency = await prisma.taskDependency.findUnique({
      where: { dependency_id: parseInt(dependency_id) },
      include: {
        predecessor: true,
        successor: true,
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Task Dependency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(dependency);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch task dependency: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/taskDependencies/{dependency_id}:
 *   put:
 *     summary: Update a task dependency
 *     description: Updates an existing task dependency by ID
 *     tags:
 *       - Task Dependencies
 *     parameters:
 *       - in: path
 *         name: dependency_id
 *         required: true
 *         description: ID of the task dependency to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *                 description: Lag time between tasks in days
 *     responses:
 *       200:
 *         description: Task dependency updated successfully
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
 *       500:
 *         description: Server error
 */
// PUT update Task Dependency
export async function PUT(
  req: Request,
  context: { params: Promise<{ dependency_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { dependency_id } = resolvedParams;
    const data = await req.json();
    const updatedDependency = await prisma.taskDependency.update({
      where: { dependency_id: parseInt(dependency_id) },
      data,
    });

    return NextResponse.json(updatedDependency);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update task dependency: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/taskDependencies/{dependency_id}:
 *   delete:
 *     summary: Delete a task dependency
 *     description: Deletes a task dependency by ID
 *     tags:
 *       - Task Dependencies
 *     parameters:
 *       - in: path
 *         name: dependency_id
 *         required: true
 *         description: ID of the task dependency to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task dependency deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task Dependency deleted successfully
 *       500:
 *         description: Server error
 */
// DELETE Task Dependency
export async function DELETE(
  req: Request,
  context: { params: Promise<{ dependency_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { dependency_id } = resolvedParams;
    await prisma.taskDependency.delete({
      where: { dependency_id: parseInt(dependency_id) },
    });

    return NextResponse.json(
      { message: "Task Dependency deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete task dependency: " + (error as Error).message },
      { status: 500 }
    );
  }
} 