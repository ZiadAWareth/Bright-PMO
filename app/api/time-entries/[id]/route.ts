import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { TimeEntryStatus } from '@prisma/client';
import { validateTimeEntry } from '@/lib/time-entry-validation';



/**
 * @swagger
 * /api/time-entries/{id}:
 *   get:
 *     summary: Get a specific time entry
 *     description: Retrieve a specific time entry by ID
 *     tags:
 *       - Time Entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Time entry details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeEntry'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const timeEntryId = parseInt(resolvedParams.id);

        const timeEntry = await prisma.timeEntry.findFirst({
            where: {
                time_entry_id: timeEntryId,
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
            }
        });

        if (!timeEntry) {
            return NextResponse.json(
                { error: 'Time entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(timeEntry);
    } catch (error) {
        console.error('Error fetching time entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch time entry' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/time-entries/{id}:
 *   put:
 *     summary: Update a specific time entry
 *     description: Update a specific time entry by ID, filtered by project and task
 *     tags:
 *       - Time Entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - task_id
 *             properties:
 *               project_id:
 *                 type: integer
 *               task_id:
 *                 type: integer
 *               hours:
 *                 type: number
 *                 format: float
 *               description:
 *                 type: string
 *               billable:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, DELETED]
 *     responses:
 *       200:
 *         description: Time entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeEntry'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, role } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const timeEntryId = parseInt(resolvedParams.id);
        const data = await req.json();

        if (!data.project_id || !data.task_id) {
            return NextResponse.json(
                { error: 'Missing required fields: project_id and task_id' },
                { status: 400 }
            );
        }

        const canEditAny = ['ADMIN', 'PMO', 'PJM'].includes(role);
        const whereClause: any = {
            time_entry_id: timeEntryId,
            project_id: parseInt(data.project_id),
            task_id: parseInt(data.task_id),
        };
        if (!canEditAny) {
            whereClause.user_id = userId;
            whereClause.timesheet = { user_id: userId };
        }

        const existingTimeEntry = await prisma.timeEntry.findFirst({
            where: whereClause,
        });

        if (!existingTimeEntry) {
            return NextResponse.json(
                { error: 'Time entry not found' },
                { status: 404 }
            );
        }

        const entryOwnerId = existingTimeEntry.user_id;

        // Validate time entry if hours, date, start_time, or end_time are being updated
        if (data.hours || data.date || data.start_time || data.end_time) {
            const validationError = await validateTimeEntry(
                entryOwnerId,
                new Date(data.date || existingTimeEntry.date),
                parseFloat(data.hours || existingTimeEntry.hours_spent.toString()),
                existingTimeEntry.task_id,
                new Date(data.start_time || existingTimeEntry.start_time),
                new Date(data.end_time || existingTimeEntry.end_time),
                timeEntryId
            );

            if (validationError) {
                return NextResponse.json(
                    { error: validationError.message },
                    { status: 400 }
                );
            }
        }

        // Update time entry
        const updatedTimeEntry = await prisma.timeEntry.update({
            where: { time_entry_id: timeEntryId },
            data: {
                hours_spent: data.hours ? parseFloat(data.hours) : existingTimeEntry.hours_spent,
                date: data.date ? new Date(data.date) : existingTimeEntry.date,
                start_time: data.start_time ? new Date(data.start_time) : existingTimeEntry.start_time,
                end_time: data.end_time ? new Date(data.end_time) : existingTimeEntry.end_time,
                description: data.description || existingTimeEntry.description,
                status: data.status as TimeEntryStatus || existingTimeEntry.status,
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

        // Update timesheet total hours
        const totalHours = await prisma.timeEntry.aggregate({
            where: {
                timesheet_id: existingTimeEntry.timesheet_id,
                status: TimeEntryStatus.SUBMITTED
            },
            _sum: {
                hours_spent: true
            }
        });

        await prisma.timesheet.update({
            where: { timesheet_id: existingTimeEntry.timesheet_id ?? undefined },
            data: {
                total_hours: totalHours._sum?.hours_spent ?? 0,
                updated_at: new Date()
            }
        });

        return NextResponse.json(updatedTimeEntry);
    } catch (error) {
        console.error('Error updating time entry:', error);
        return NextResponse.json(
            { error: 'Failed to update time entry' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/time-entries/{id}:
 *   delete:
 *     summary: Delete a specific time entry
 *     description: Delete a specific time entry by ID, filtered by project and task
 *     tags:
 *       - Time Entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - task_id
 *             properties:
 *               project_id:
 *                 type: integer
 *               task_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Time entry deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, role } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const timeEntryId = parseInt(resolvedParams.id);
        const data = await req.json();

        if (!data.project_id || !data.task_id) {
            return NextResponse.json(
                { error: 'Missing required fields: project_id and task_id' },
                { status: 400 }
            );
        }

        const canDeleteAny = ['ADMIN', 'PMO', 'PJM'].includes(role);
        const whereClause: any = {
            time_entry_id: timeEntryId,
            project_id: parseInt(data.project_id),
            task_id: parseInt(data.task_id),
        };
        if (!canDeleteAny) {
            whereClause.user_id = userId;
            whereClause.timesheet = { user_id: userId };
        }

        const existingTimeEntry = await prisma.timeEntry.findFirst({
            where: whereClause,
        });

        if (!existingTimeEntry) {
            return NextResponse.json(
                { error: 'Time entry not found' },
                { status: 404 }
            );
        }

        // Delete time entry
        await prisma.timeEntry.delete({
            where: { time_entry_id: timeEntryId }
        });

        // Update timesheet total hours
        const totalHours = await prisma.timeEntry.aggregate({
            where: {
                timesheet_id: existingTimeEntry.timesheet_id,
                status: TimeEntryStatus.SUBMITTED
            },
            _sum: {
                hours_spent: true
            }
        });

        await prisma.timesheet.update({
            where: { timesheet_id: existingTimeEntry.timesheet_id ?? undefined },
            data: {
                total_hours: totalHours._sum?.hours_spent ?? 0,
                updated_at: new Date()
            }
        });

        return NextResponse.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting time entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete time entry' },
            { status: 500 }
        );
    }
} 