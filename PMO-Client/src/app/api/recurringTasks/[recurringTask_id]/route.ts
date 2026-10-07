import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurrenceFrequency } from '@prisma/client';

/**
 * @swagger
 * /api/recurringTasks/{recurringTask_id}:
 *   get:
 *     summary: Get a recurring task by ID
 *     description: Retrieves a specific recurring task by its ID with associated WBS
 *     tags:
 *       - Recurring Tasks
 *     parameters:
 *       - in: path
 *         name: recurringTask_id
 *         required: true
 *         description: ID of the recurring task to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recurring task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recurring_task_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 wbs_id:
 *                   type: integer
 *                 frequency:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date-time
 *                 end_date:
 *                   type: string
 *                   format: date-time
 *                 last_created:
 *                   type: string
 *                   format: date-time
 *                 is_active:
 *                   type: boolean
 *                 wbs:
 *                   type: object
 *       404:
 *         description: Recurring task not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ recurringTask_id: string }> }) {
  const resolvedParams = await context.params;
  const { recurringTask_id } = resolvedParams;
  try {
    const recurringTask = await prisma.recurringTask.findUnique({
      where: { recurring_task_id: parseInt(recurringTask_id) },
      include: {
        wbs: true,
      },
    });

    if (!recurringTask) {
      return NextResponse.json(
        { error: 'Recurring task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(recurringTask);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recurring task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/recurringTasks/{recurringTask_id}:
 *   put:
 *     summary: Update a recurring task
 *     description: Updates an existing recurring task
 *     tags:
 *       - Recurring Tasks
 *     parameters:
 *       - in: path
 *         name: recurringTask_id
 *         required: true
 *         description: ID of the recurring task to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               wbs_id:
 *                 type: integer
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Recurring task updated successfully
 *       404:
 *         description: Recurring task not found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ recurringTask_id: string }> }) {
  const resolvedParams = await context.params;
  const { recurringTask_id } = resolvedParams;
  try {
    const body = await req.json();
    const { name, description, wbs_id, frequency, start_date, end_date, is_active } = body;

    // Validate enum values if provided
    if (frequency && !Object.values(RecurrenceFrequency).includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency' },
        { status: 400 }
      );
    }

    const recurringTask = await prisma.recurringTask.update({
      where: { recurring_task_id: parseInt(recurringTask_id) },
      data: {
        name,
        description,
        wbs_id,
        frequency,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        is_active,
      },
      include: {
        wbs: true,
      },
    });

    return NextResponse.json(recurringTask);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Recurring task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update recurring task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/recurringTasks/{recurringTask_id}:
 *   delete:
 *     summary: Delete a recurring task
 *     description: Deletes a recurring task by ID
 *     tags:
 *       - Recurring Tasks
 *     parameters:
 *       - in: path
 *         name: recurringTask_id
 *         required: true
 *         description: ID of the recurring task to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recurring task deleted successfully
 *       404:
 *         description: Recurring task not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ recurringTask_id: string }> }) {
  const resolvedParams = await context.params;
  const { recurringTask_id } = resolvedParams;
  try {
    await prisma.recurringTask.delete({
      where: { recurring_task_id: parseInt(recurringTask_id) },
    });

    return NextResponse.json(
      { message: 'Recurring task deleted successfully' }
    );
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Recurring task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete recurring task: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 