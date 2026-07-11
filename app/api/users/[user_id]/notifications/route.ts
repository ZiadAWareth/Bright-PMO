import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationStatus } from '@prisma/client';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/users/{user_id}/notifications:
 *   get:
 *     summary: Get notifications for a specific user
 *     description: Retrieves notifications for the specified user with optional filtering and pagination. Use 'me' as user_id for current user.
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
 *         example: "me"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UNREAD, READ, ARCHIVED]
 *         description: Filter notifications by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                       metadata:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       read_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                 total:
 *                   type: integer
 *                   description: Total number of notifications for this user
 *                 unreadCount:
 *                   type: integer
 *                   description: Number of unread notifications
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot access other user's notifications
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ user_id: string }> }
) {
    try {
        const resolvedParams = await context.params;
        const { user_id } = resolvedParams;
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

        // Verify target user exists
        const targetUser = await prisma.user.findUnique({
            where: { user_id: targetUserId },
            select: { user_id: true, status: true }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get URL parameters for filtering and pagination
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as NotificationStatus | null;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build the where clause for target user
        const where = {
            user_id: targetUserId,
            ...(status && { status }),
        };

        // Get notifications with pagination (database-level filtering)
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
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
                orderBy: {
                    created_at: 'desc',
                },
                skip: offset,
                take: limit,
            }),
            prisma.notification.count({ where }),
        ]);

        // Get unread count for this user
        const unreadCount = await prisma.notification.count({
            where: {
                user_id: targetUserId,
                status: 'UNREAD',
            },
        });

        return NextResponse.json({
            notifications,
            total,
            unreadCount,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error fetching user notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/users/{user_id}/notifications:
 *   patch:
 *     summary: Bulk update notification status for a user
 *     description: Updates the status of multiple notifications for the specified user
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notification_ids
 *               - status
 *             properties:
 *               notification_ids:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 description: Single notification ID or array of notification IDs
 *               status:
 *                 type: string
 *                 enum: [UNREAD, READ, ARCHIVED]
 *                 description: New status for the notifications
 *     responses:
 *       200:
 *         description: Notifications updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ user_id: string }> }
) {
    try {
        const resolvedParams = await context.params;
        const { user_id } = resolvedParams;
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

        const data = await request.json();
        const { notification_ids, status } = data;

        if (!notification_ids || !status) {
            return NextResponse.json({ 
                error: "Missing required fields: notification_ids, status" 
            }, { status: 400 });
        }

        // Update notifications - only for the target user
        const result = await prisma.notification.updateMany({
            where: {
                notification_id: {
                    in: Array.isArray(notification_ids) ? notification_ids : [notification_ids],
                },
                user_id: targetUserId, // Security: only update target user's notifications
            },
            data: {
                status,
                read_at: status === 'READ' ? new Date() : null,
            },
        });

        return NextResponse.json({
            updated: result.count,
            status: 'success',
        });
    } catch (error) {
        console.error('Error updating user notifications:', error);
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        );
    }
} 