import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/recent-activities/{id}:
 *   get:
 *     summary: Get a specific activity
 *     description: Retrieve details of a specific activity by ID
 *     tags:
 *       - Recent Activities
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity_id:
 *                   type: integer
 *                 user_id:
 *                   type: integer
 *                 action:
 *                   type: string
 *                 entity_type:
 *                   type: string
 *                 entity_id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 user:
 *                   type: object
 *       404:
 *         description: Activity not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromHeaders();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const activityId = parseInt(resolvedParams.id);
        if (isNaN(activityId)) {
            return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
        }

        const activity = await prisma.recentActivity.findUnique({
            where: { activity_id: activityId },
            include: {
                user: {
                    select: {
                        username: true,
                        account: {
                            select: {
                                first_name: true,
                                last_name: true,
                            }
                        }
                    }
                }
            }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        // Users can only view their own activities unless they're admin
        if (activity.user_id !== user.userId && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(activity);

    } catch (error) {
        console.error('Error fetching activity:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/recent-activities/{id}:
 *   put:
 *     summary: Update an activity
 *     description: Update an existing activity (admin only or own activity within 10 minutes)
 *     tags:
 *       - Recent Activities
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Activity not found
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromHeaders();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const activityId = parseInt(resolvedParams.id);
        if (isNaN(activityId)) {
            return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
        }

        const activity = await prisma.recentActivity.findUnique({
            where: { activity_id: activityId }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        // Check permissions
        const isOwner = activity.user_id === user.userId;
        const isAdmin = user.role === 'ADMIN';
        const isRecent = new Date().getTime() - new Date(activity.created_at).getTime() < 10 * 60 * 1000; // 10 minutes

        if (!isAdmin && (!isOwner || !isRecent)) {
            return NextResponse.json(
                { error: 'You can only edit your own activities within 10 minutes of creation' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { title, description, metadata } = body;

        const updatedActivity = await prisma.recentActivity.update({
            where: { activity_id: activityId },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(metadata !== undefined && { metadata }),
            }
        });

        return NextResponse.json({
            message: 'Activity updated successfully',
            activity: updatedActivity
        });

    } catch (error) {
        console.error('Error updating activity:', error);
        return NextResponse.json(
            { error: 'Failed to update activity' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/recent-activities/{id}:
 *   delete:
 *     summary: Delete an activity
 *     description: Delete an activity (admin only)
 *     tags:
 *       - Recent Activities
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Activity not found
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromHeaders();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin can delete activities
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only administrators can delete activities' },
                { status: 403 }
            );
        }

        const resolvedParams = await params;
        const activityId = parseInt(resolvedParams.id);
        if (isNaN(activityId)) {
            return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
        }

        const activity = await prisma.recentActivity.findUnique({
            where: { activity_id: activityId }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        await prisma.recentActivity.delete({
            where: { activity_id: activityId }
        });

        return NextResponse.json({
            message: 'Activity deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting activity:', error);
        return NextResponse.json(
            { error: 'Failed to delete activity' },
            { status: 500 }
        );
    }
}
