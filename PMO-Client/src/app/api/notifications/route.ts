import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create and send notifications
 *     description: Creates notifications and sends them to specified users by role or username
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [PROJECT_CREATION, PROJECT_UPDATE, TASK_ASSIGNMENT, DEADLINE_REMINDER, BUDGET_ALERT, RISK_ALERT, DOCUMENT_UPDATE, SYSTEM_ALERT, MAINTENANCE_DUE]
 *                 description: Type of notification
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message content
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *                 default: MEDIUM
 *                 description: Priority level of the notification
 *               target_roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role names to target (sends to all users with these roles)
 *                 example: ["site_manager", "maintenance_technician"]
 *               target_usernames:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of specific usernames to target
 *                 example: ["john.doe", "sarah.smith"]
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the notification
 *                 example: {"resource_id": 123, "site_id": 45}
 *     responses:
 *       201:
 *         description: Notifications created and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       notification_id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 recipients_count:
 *                   type: integer
 *                   description: Total number of recipients who received the notification
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: type, title, message"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User ID not found in headers"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create notification"
 */
export async function POST(request: Request) {
    try {
        // Get user from middleware headers (x-user-id)
        const { userId } = await getUserFromHeaders();
        const data = await request.json();
        const { 
            type, 
            title, 
            message, 
            priority = 'MEDIUM',
            target_roles,
            target_usernames,
            metadata 
        } = data;

        if (!type || !title || !message) {
            return NextResponse.json({ 
                error: "Missing required fields: type, title, message" 
            }, { status: 400 });
        }

        // Start a transaction to create notification and target users
        const result = await prisma.$transaction(async (tx) => {
            let targetUsers: { user_id: number }[] = [];

            // If target_roles is provided, find users by role names
            if (target_roles && target_roles.length > 0) {
                const roleUsers = await tx.user.findMany({
                    where: {
                        role: {
                            name: {
                                in: target_roles,
                            }
                        },
                        status: 'active',
                    },
                    select: {
                        user_id: true,
                    },
                });
                targetUsers.push(...roleUsers);
            }

            // If target_usernames is provided, find users by usernames
            if (target_usernames && target_usernames.length > 0) {
                const usernameUsers = await tx.user.findMany({
                    where: {
                        username: {
                            in: target_usernames,
                        },
                        status: 'active',
                    },
                    select: {
                        user_id: true,
                    },
                });
                targetUsers.push(...usernameUsers);
            }

            // Remove duplicates
            const uniqueUserIds = [...new Set(targetUsers.map(u => u.user_id))];

            // Create notifications for each target user
            const notifications = await Promise.all(
                uniqueUserIds.map(targetUserId =>
                    tx.notification.create({
                        data: {
                            user_id: targetUserId,
                            type,
                            title,
                            message,
                            priority,
                            metadata,
                            created_by_id: userId, // From middleware
                        },
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
                    })
                )
            );

            return { 
                notifications,
                recipients_count: uniqueUserIds.length 
            };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        // Get user from middleware headers (x-user-id)
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get('status'); // Filter by status (READ/UNREAD)
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Build where clause
        const whereClause: any = { user_id: userId };
        if (status && ['read', 'unread'].includes(status.toLowerCase())) {
            whereClause.status = status.toUpperCase();
        }

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
            include: {
                created_by: {
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

        // Get unread count
        const unreadCount = await prisma.notification.count({
            where: { user_id: userId, status: 'UNREAD' }
        });

        return NextResponse.json({ 
            notifications, 
            unread_count: unreadCount,
            total: notifications.length 
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/notifications:
 *   patch:
 *     summary: Bulk update notifications
 *     description: Mark multiple notifications as read or unread
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notification_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of notification IDs to update
 *               status:
 *                 type: string
 *                 enum: [READ, UNREAD]
 *                 description: New status for the notifications
 *               mark_all:
 *                 type: boolean
 *                 description: If true, marks all user's notifications with the status
 *     responses:
 *       200:
 *         description: Notifications updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
export async function PATCH(request: Request) {
    try {
        const { userId } = await getUserFromHeaders();
        const { notification_ids, status, mark_all } = await request.json();

        // Validate status
        if (!['READ', 'UNREAD'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be READ or UNREAD' },
                { status: 400 }
            );
        }

        let whereClause: any = { user_id: userId };

        if (mark_all) {
            // Mark all notifications for the user
            whereClause = { user_id: userId };
        } else if (notification_ids && notification_ids.length > 0) {
            // Mark specific notifications
            whereClause = {
                user_id: userId,
                notification_id: { in: notification_ids }
            };
        } else {
            return NextResponse.json(
                { error: 'Either notification_ids or mark_all must be provided' },
                { status: 400 }
            );
        }

        const result = await prisma.notification.updateMany({
            where: whereClause,
            data: {
                status,
                read_at: status === 'READ' ? new Date() : null,
            },
        });

        return NextResponse.json({
            message: `${result.count} notifications updated successfully`,
            updated_count: result.count
        });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     summary: Bulk delete notifications
 *     description: Delete multiple notifications for the current user
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notification_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of notification IDs to delete
 *               delete_all:
 *                 type: boolean
 *                 description: If true, deletes all user's notifications
 *               delete_read:
 *                 type: boolean
 *                 description: If true, deletes all read notifications
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
export async function DELETE(request: Request) {
    try {
        const { userId } = await getUserFromHeaders();
        const { notification_ids, delete_all, delete_read } = await request.json();

        let whereClause: any = { user_id: userId };

        if (delete_all) {
            // Delete all notifications for the user
            whereClause = { user_id: userId };
        } else if (delete_read) {
            // Delete all read notifications
            whereClause = { user_id: userId, status: 'READ' };
        } else if (notification_ids && notification_ids.length > 0) {
            // Delete specific notifications
            whereClause = {
                user_id: userId,
                notification_id: { in: notification_ids }
            };
        } else {
            return NextResponse.json(
                { error: 'Either notification_ids, delete_all, or delete_read must be provided' },
                { status: 400 }
            );
        }

        const result = await prisma.notification.deleteMany({
            where: whereClause,
        });

        return NextResponse.json({
            message: `${result.count} notifications deleted successfully`,
            deleted_count: result.count
        });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        return NextResponse.json(
            { error: 'Failed to delete notifications' },
            { status: 500 }
        );
    }
}