import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import { getUserFromHeaders } from '@/lib/auth-helpers'; 
import { verifyToken } from '@/lib/jwt';
import { TimeEntryStatus } from '@prisma/client';
import { validateTimeEntry } from '@/lib/time-entry-validation';
import { findMatchingTimesheet } from '@/lib/timesheet-helpers';


/**
 * @swagger
 * /api/time-entries:
 *   get:
 *     summary: Get all time entries
 *     description: Retrieve a list of all time entries for the authenticated user
 *     tags:
 *       - Time Entries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of time entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TimeEntry'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
export async function GET() {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                user_id: userId,
                timesheet: {
                    user_id: userId
                }
            },
            include: {
                timesheet: {
                    include: {
                        project: true
                    }
                },
                task: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return NextResponse.json(timeEntries);
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch time entries' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/time-entries:
 *   post:
 *     summary: Create a new time entry
 *     description: Create a new time entry for the authenticated user
 *     tags:
 *       - Time Entries
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_id
 *               - date
 *               - hours
 *               - start_time
 *               - end_time
 *             properties:
 *               task_id:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               hours:
 *                 type: number
 *                 format: float
 *               description:
 *                 type: string
 *               billable:
 *                 type: boolean
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Time entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeEntry'
 *       400:
 *         description: Invalid input data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
export async function POST(req: Request) {
    try {
        const { userId, role } = await getUserFromHeaders();
        const data = await req.json();

        console.log('Creating time entry with data:', data);

        // Validate required fields
        if (!data.task_id || !data.date || !data.hours || !data.start_time || !data.end_time) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get the task to get its project_id
        const task = await prisma.task.findUnique({
            where: { task_id: parseInt(data.task_id) },
            include: {
                wbs: {
                    include: {
                        project: true
                    }
                }
            }
        });

        console.log('Found task:', task);

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        const projectId = task.wbs.project.project_id;
        const canAddOnBehalf = ['ADMIN', 'PMO', 'PJM'].includes(role);
        let targetTimesheet: { timesheet_id: number; user_id: number };
        let entryUserId: number;

        if (data.timesheet_id != null && canAddOnBehalf) {
            // Admin/PJM adding entry on behalf: use provided timesheet
            const timesheet = await prisma.timesheet.findFirst({
                where: {
                    timesheet_id: parseInt(data.timesheet_id),
                    project_id: projectId,
                    status: { in: ['DRAFT', 'SUBMITTED'] }
                }
            });
            if (!timesheet) {
                return NextResponse.json(
                    { error: 'Timesheet not found or not editable for this project.' },
                    { status: 400 }
                );
            }
            const entryDate = new Date(data.date);
            if (entryDate < new Date(timesheet.start_date) || entryDate > new Date(timesheet.end_date)) {
                return NextResponse.json(
                    { error: 'Entry date must fall within the timesheet period.' },
                    { status: 400 }
                );
            }
            targetTimesheet = { timesheet_id: timesheet.timesheet_id, user_id: timesheet.user_id };
            entryUserId = timesheet.user_id;
        } else {
            // Normal flow: find timesheet for current user
            const matchingTimesheet = await findMatchingTimesheet(
                projectId,
                userId,
                new Date(data.date)
            );
            if (!matchingTimesheet) {
                return NextResponse.json(
                    { error: 'No active timesheet found for this project and date. Please create a timesheet first.' },
                    { status: 400 }
                );
            }
            targetTimesheet = { timesheet_id: matchingTimesheet.timesheet_id, user_id: userId };
            entryUserId = userId;
        }

        const entryDate = new Date(data.date);
        const startTimeStr = String(data.start_time).length <= 5 ? data.start_time : data.start_time.slice(0, 5);
        const endTimeStr = String(data.end_time).length <= 5 ? data.end_time : data.end_time.slice(0, 5);
        const startDateTime = new Date(`${data.date}T${startTimeStr}:00`);
        const endDateTime = new Date(`${data.date}T${endTimeStr}:00`);

        const validationError = await validateTimeEntry(
            entryUserId,
            entryDate,
            parseFloat(data.hours),
            parseInt(data.task_id),
            startDateTime,
            endDateTime
        );

        if (validationError) {
            return NextResponse.json(
                { error: validationError.message },
                { status: 400 }
            );
        }

        const timeEntry = await prisma.timeEntry.create({
            data: {
                user_id: entryUserId,
                timesheet_id: targetTimesheet.timesheet_id,
                task_id: parseInt(data.task_id),
                project_id: projectId,
                date: entryDate,
                start_time: startDateTime,
                end_time: endDateTime,
                hours_spent: parseFloat(data.hours),
                description: data.description || '',
                status: TimeEntryStatus.DRAFT,
                created_at: new Date(),
                updated_at: new Date()
            },
            include: {
                timesheet: {
                    include: {
                        project: true
                    }
                },
                task: true
            }
        });

        console.log('Created time entry:', timeEntry);

        const totalHours = await prisma.timeEntry.aggregate({
            where: {
                timesheet_id: targetTimesheet.timesheet_id,
                status: TimeEntryStatus.SUBMITTED
            },
            _sum: {
                hours_spent: true
            }
        });

        await prisma.timesheet.update({
            where: { timesheet_id: targetTimesheet.timesheet_id },
            data: {
                total_hours: totalHours._sum?.hours_spent ?? 0,
                updated_at: new Date()
            }
        });

        return NextResponse.json(timeEntry, { status: 201 });
    } catch (error) {
        console.error('Error creating time entry:', error);
        // Log the full error details
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        return NextResponse.json(
            { error: 'Failed to create time entry' },
            { status: 500 }
        );
    }
}
