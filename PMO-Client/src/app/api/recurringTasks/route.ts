import { NextResponse } from 'next/server';
import { RecurringTaskService } from '@/lib/services/recurring-task.service';
import { RecurrenceFrequency } from '@prisma/client';

/**
 * @swagger
 * /api/recurringTasks:
 *   get:
 *     summary: Get all recurring tasks
 *     description: Retrieves a list of all recurring tasks with their associated WBS
 *     tags:
 *       - Recurring Tasks
 *     responses:
 *       200:
 *         description: List of recurring tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   recurring_task_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   wbs_id:
 *                     type: integer
 *                   frequency:
 *                     type: string
 *                     enum: [DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                   last_created:
 *                     type: string
 *                     format: date-time
 *                   is_active:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                   wbs:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const recurringTaskService = RecurringTaskService.getInstance();
    const tasks = await recurringTaskService.getAllRecurringTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch recurring tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring tasks' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/recurringTasks:
 *   post:
 *     summary: Create a new recurring task
 *     description: Creates a new recurring task with the specified frequency and schedule
 *     tags:
 *       - Recurring Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - wbs_id
 *               - frequency
 *               - start_date
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the recurring task
 *               description:
 *                 type: string
 *                 description: Description of the recurring task
 *               wbs_id:
 *                 type: integer
 *                 description: ID of the WBS this task belongs to
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *                 description: Frequency of task recurrence
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Start date of the recurring task
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional end date of the recurring task
 *     responses:
 *       201:
 *         description: Recurring task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recurring_task_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       400:
 *         description: Missing required fields or invalid input
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, wbs_id, frequency, start_date, end_date } = body;

    // Validate required fields
    if (!name || !wbs_id || !frequency || !start_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate frequency
    if (!Object.values(RecurrenceFrequency).includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      );
    }

    const recurringTaskService = RecurringTaskService.getInstance();
    const task = await recurringTaskService.createRecurringTask({
      name,
      description,
      wbs_id,
      frequency,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : undefined,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create recurring task:', error);
    return NextResponse.json(
      { error: 'Failed to create recurring task' },
      { status: 500 }
    );
  }
} 