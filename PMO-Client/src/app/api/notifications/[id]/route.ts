import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Get a specific notification
 *     description: Retrieves a specific notification by ID for the current user
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the notification to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const { userId } = await getUserFromHeaders();

    const notification = await prisma.notification.findFirst({
      where: {
        notification_id: parseInt(id),
        user_id: userId, // Ensure user can only access their own notifications
      },
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
 * /api/notifications/{id}:
 *   patch:
 *     summary: Update notification status
 *     description: Updates a notification's status (mark as read/unread)
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the notification to update
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
 *                 enum: [READ, UNREAD]
 *                 description: New status for the notification
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const { userId } = await getUserFromHeaders();
    const { status } = await req.json();

    // Validate status
    if (!['READ', 'UNREAD'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be READ or UNREAD' },
        { status: 400 }
      );
    }

    // Update notification with ownership check
    const updatedNotification = await prisma.notification.updateMany({
      where: {
        notification_id: parseInt(id),
        user_id: userId, // Ensure user can only update their own notifications
      },
      data: {
        status,
        read_at: status === 'READ' ? new Date() : null,
      },
    });

    if (updatedNotification.count === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Fetch the updated notification to return
    const notification = await prisma.notification.findFirst({
      where: {
        notification_id: parseInt(id),
        user_id: userId,
      },
    });

    return NextResponse.json(notification);
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
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Deletes a specific notification for the current user
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the notification to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const { userId } = await getUserFromHeaders();

    // Delete notification with ownership check
    const deletedNotification = await prisma.notification.deleteMany({
      where: {
        notification_id: parseInt(id),
        user_id: userId, // Ensure user can only delete their own notifications
      },
    });

    if (deletedNotification.count === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Notification deleted successfully',
      deleted_count: deletedNotification.count 
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
