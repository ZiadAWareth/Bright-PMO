import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/users/{user_id}/notifications/{notification_id}:
 *   get:
 *     summary: Get a specific notification for a user
 *     description: Retrieves a single notification by ID for the specified user
 *     tags:
 *       - User Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [me]
 *             - type: integer
 *         description: User ID or 'me' for current user
 *       - in: path
 *         name: notification_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ user_id: string; notification_id: string }> }
) {
    try {
        const resolvedParams = await context.params;
        const { user_id, notification_id } = resolvedParams;
        // Get current user from middleware headers
        const { userId: currentUserId, role } = await getUserFromHeaders();
        
        // Determine target user ID
        let targetUserId: number;
        
        if (user_id === 'me') {
            targetUserId = currentUserId;
        } else {
            targetUserId = parseInt(user_id);
            
            // Authorization: Only allow access to own notifications unless admin
            if (targetUserId !== currentUserId && role !== 'admin') {
                return NextResponse.json(
                    { error: 'Forbidden: Cannot access other user\'s notifications' },
                    { status: 403 }
                );
            }
        }

        const notificationId = parseInt(notification_id);

        // Get the specific notification
        const notification = await prisma.notification.findFirst({
            where: {
                notification_id: notificationId,
                user_id: targetUserId, // Ensure notification belongs to target user
            },
            include: {
                created_by: {
                    include: {
                        account: {
                            select: {
                                first_name: true,
                                last_name: true,
                            }
                        },
                    },
                },
            },
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(notification);
    } catch (error) {
        console.error('Error fetching notification:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notification' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/users/{user_id}/notifications/{notification_id}:
 *   patch:
 *     summary: Update a specific notification
 *     description: Updates the status or other properties of a specific notification
 *     tags:
 *       - User Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [me]
 *             - type: integer
 *         description: User ID or 'me' for current user
 *       - in: path
 *         name: notification_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNREAD, READ, ARCHIVED]
 *                 description: New status for the notification
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ user_id: string; notification_id: string }> }
) {
    try {
        const resolvedParams = await context.params;
        const { user_id, notification_id } = resolvedParams;
        // Get current user from middleware headers
        const { userId: currentUserId, role } = await getUserFromHeaders();
        
        // Determine target user ID
        let targetUserId: number;
        
        if (user_id === 'me') {
            targetUserId = currentUserId;
        } else {
            targetUserId = parseInt(user_id);
            
            // Authorization: Only allow access to own notifications unless admin
            if (targetUserId !== currentUserId && role !== 'admin') {
                return NextResponse.json(
                    { error: 'Forbidden: Cannot update other user\'s notifications' },
                    { status: 403 }
                );
            }
        }

        const notificationId = parseInt(notification_id);
        const data = await request.json();
        const { status } = data;

        if (!status) {
            return NextResponse.json(
                { error: 'Missing required field: status' },
                { status: 400 }
            );
        }

        // Update the specific notification
        const notification = await prisma.notification.updateMany({
            where: {
                notification_id: notificationId,
                user_id: targetUserId, // Ensure notification belongs to target user
            },
            data: {
                status,
                read_at: status === 'READ' ? new Date() : null,
            },
        });

        if (notification.count === 0) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            updated: notification.count,
            status: 'success',
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json(
            { error: 'Failed to update notification' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/users/{user_id}/notifications/{notification_id}:
 *   delete:
 *     summary: Delete a specific notification
 *     description: Deletes a specific notification for the user
 *     tags:
 *       - User Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [me]
 *             - type: integer
 *         description: User ID or 'me' for current user
 *       - in: path
 *         name: notification_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ user_id: string; notification_id: string }> }
) {
    try {
        const resolvedParams = await context.params;
        const { user_id, notification_id } = resolvedParams;
        // Get current user from middleware headers
        const { userId: currentUserId, role } = await getUserFromHeaders();
        
        // Determine target user ID
        let targetUserId: number;
        
        if (user_id === 'me') {
            targetUserId = currentUserId;
        } else {
            targetUserId = parseInt(user_id);
            
            // Authorization: Only allow access to own notifications unless admin
            if (targetUserId !== currentUserId && role !== 'admin') {
                return NextResponse.json(
                    { error: 'Forbidden: Cannot delete other user\'s notifications' },
                    { status: 403 }
                );
            }
        }

        const notificationId = parseInt(notification_id);

        // Delete the specific notification
        const result = await prisma.notification.deleteMany({
            where: {
                notification_id: notificationId,
                user_id: targetUserId, // Ensure notification belongs to target user
            },
        });

        if (result.count === 0) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            deleted: result.count,
            status: 'success',
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return NextResponse.json(
            { error: 'Failed to delete notification' },
            { status: 500 }
        );
    }
} 