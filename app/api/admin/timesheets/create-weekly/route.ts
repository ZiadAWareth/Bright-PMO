import { NextResponse } from 'next/server';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { TimesheetService } from '@/lib/services/timesheet.service';

/**
 * @swagger
 * /api/admin/timesheets/create-weekly:
 *   post:
 *     summary: Manually trigger weekly timesheet creation
 *     description: Creates weekly timesheets for all active users (Admin only)
 *     tags:
 *       - Admin
 *       - Timesheets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly timesheets created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
export async function POST() {
    try {
        const { userId, role } = await getUserFromHeaders();
        
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user has admin privileges
        if (role !== 'ADMIN') {
            return NextResponse.json(
                { error: "Forbidden. Admin access required." },
                { status: 403 }
            );
        }

        const timesheetService = TimesheetService.getInstance();
        await timesheetService.createWeeklyTimesheets();

        return NextResponse.json({
            message: "Weekly timesheets created successfully",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error creating weekly timesheets:', error);
        return NextResponse.json(
            { error: 'Failed to create weekly timesheets' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/admin/timesheets/cleanup:
 *   post:
 *     summary: Manually trigger timesheet cleanup
 *     description: Removes old draft timesheets with no entries (Admin only)
 *     tags:
 *       - Admin
 *       - Timesheets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timesheet cleanup completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
export async function DELETE() {
    try {
        const { userId, role } = await getUserFromHeaders();
        
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user has admin privileges
        if (role !== 'ADMIN' && role !== 'super_admin') {
            return NextResponse.json(
                { error: "Forbidden. Admin access required." },
                { status: 403 }
            );
        }

        const timesheetService = TimesheetService.getInstance();
        await timesheetService.cleanupOldDraftTimesheets();

        return NextResponse.json({
            message: "Timesheet cleanup completed successfully",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error during timesheet cleanup:', error);
        return NextResponse.json(
            { error: 'Failed to cleanup timesheets' },
            { status: 500 }
        );
    }
}
