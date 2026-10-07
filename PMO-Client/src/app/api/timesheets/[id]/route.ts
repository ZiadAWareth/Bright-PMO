import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/timesheets/{id}:
 *   get:
 *     summary: Get a specific timesheet
 *     description: Retrieve a specific timesheet by ID
 *     tags:
 *       - Timesheets
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
 *         description: Timesheet details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Timesheet'
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
        const { userId, role } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const timesheetId = parseInt(resolvedParams.id);

        // Check if user can view any timesheet: use DB role as fallback so PJM/PMO/ADMIN
        // work even when JWT role differs from PMO role names
        let canViewAnyTimesheet = ['ADMIN', 'PMO', 'PJM'].includes(role);
        if (!canViewAnyTimesheet) {
            const userWithRole = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { role: { select: { name: true } } },
            });
            const dbRoleName = userWithRole?.role?.name?.toUpperCase();
            canViewAnyTimesheet = dbRoleName ? ['ADMIN', 'PMO', 'PJM'].includes(dbRoleName) : false;
        }

        // Build the where clause based on user role
        const whereClause = canViewAnyTimesheet 
            ? { timesheet_id: timesheetId }  // Admin users can view any timesheet
            : { timesheet_id: timesheetId, user_id: userId };  // Regular users can only view their own

        const timesheet = await prisma.timesheet.findFirst({
            where: whereClause,
            include: {
                time_entries: {
                    include: {
                        task: true
                    },
                    orderBy: {
                        date: 'asc'
                    }
                },
                project: true,
                user: {
                    include: {
                        account: true,
                        role: true
                    }
                }
            }
        });

        if (!timesheet) {
            return NextResponse.json(
                { error: 'Timesheet not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(timesheet);
    } catch (error) {
        console.error('Error fetching timesheet:', error);
        return NextResponse.json(
            { error: 'Failed to fetch timesheet' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/timesheets/{id}:
 *   put:
 *     summary: Update a specific timesheet
 *     description: Update a specific timesheet by ID
 *     tags:
 *       - Timesheets
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timesheet updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Timesheet'
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
        const timesheetId = parseInt(resolvedParams.id);
        const data = await req.json();

        // Check if user can modify any timesheet: use DB role as fallback (same as GET)
        let canModifyAnyTimesheet = ['ADMIN', 'PMO', 'PJM'].includes(role);
        if (!canModifyAnyTimesheet) {
            const userWithRole = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { role: { select: { name: true } } },
            });
            const dbRoleName = userWithRole?.role?.name?.toUpperCase();
            canModifyAnyTimesheet = dbRoleName ? ['ADMIN', 'PMO', 'PJM'].includes(dbRoleName) : false;
        }

        // Build the where clause based on user role
        const whereClause = canModifyAnyTimesheet 
            ? { timesheet_id: timesheetId }  // Admin users can modify any timesheet
            : { timesheet_id: timesheetId, user_id: userId };  // Regular users can only modify their own

        // Check if timesheet exists and user has permission to modify it
        const existingTimesheet = await prisma.timesheet.findFirst({
            where: whereClause
        });

        if (!existingTimesheet) {
            return NextResponse.json(
                { error: 'Timesheet not found or you do not have permission to modify it' },
                { status: 404 }
            );
        }

        // Update timesheet
        const updatedTimesheet = await prisma.timesheet.update({
            where: { timesheet_id: timesheetId },
            data: {
                status: data.status || existingTimesheet.status,
                comments: data.comments !== undefined ? data.comments : existingTimesheet.comments,
                updated_at: new Date()
            },
            include: {
                time_entries: {
                    include: {
                        task: true
                    }
                },
                project: true,
                user: {
                    include: {
                        account: true,
                        role: true
                    }
                }
            }
        });

        return NextResponse.json(updatedTimesheet);
    } catch (error) {
        console.error('Error updating timesheet:', error);
        return NextResponse.json(
            { error: 'Failed to update timesheet' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/timesheets/{id}:
 *   delete:
 *     summary: Delete a specific timesheet
 *     description: Delete a specific timesheet by ID
 *     tags:
 *       - Timesheets
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
 *         description: Timesheet deleted successfully
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
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const timesheetId = parseInt(resolvedParams.id);

        // Check if timesheet exists and belongs to user
        const existingTimesheet = await prisma.timesheet.findFirst({
            where: {
                timesheet_id: timesheetId,
                user_id: userId
            }
        });

        if (!existingTimesheet) {
            return NextResponse.json(
                { error: 'Timesheet not found' },
                { status: 404 }
            );
        }

        // Delete associated time entries first
        await prisma.timeEntry.deleteMany({
            where: { timesheet_id: timesheetId }
        });

        // Delete timesheet
        await prisma.timesheet.delete({
            where: { timesheet_id: timesheetId }
        });

        return NextResponse.json({ message: 'Timesheet deleted successfully' });
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        return NextResponse.json(
            { error: 'Failed to delete timesheet' },
            { status: 500 }
        );
    }
}
