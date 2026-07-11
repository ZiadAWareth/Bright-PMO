import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/recent-activities:
 *   get:
 *     summary: Get recent activities
 *     description: Retrieve recent activities for the current user or all users (admin only)
 *     tags:
 *       - Recent Activities
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of activities to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of activities to skip
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *         description: Filter by entity type (project, task, risk, etc.)
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID (admin only)
 *     responses:
 *       200:
 *         description: List of recent activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       activity_id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       action:
 *                         type: string
 *                       entity_type:
 *                         type: string
 *                       entity_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                           account:
 *                             type: object
 *                             properties:
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                 total:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
    try {
        const user = await getUserFromHeaders();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const entityType = searchParams.get('entity_type');
        const filterUserId = searchParams.get('user_id');

        // Build filter conditions
        const where: any = {};

        // Only admin can view other users' activities
        if (filterUserId && user.role === 'ADMIN') {
            where.user_id = parseInt(filterUserId);
        } else {
            // Regular users can only see their own activities
            where.user_id = user.userId;
        }

        if (entityType) {
            where.entity_type = entityType;
        }

        // Get activities with user information
        const [activities, total] = await Promise.all([
            prisma.recentActivity.findMany({
                where,
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
                },
                orderBy: {
                    created_at: 'desc'
                },
                take: limit,
                skip: offset
            }),
            prisma.recentActivity.count({ where })
        ]);

        return NextResponse.json({
            activities,
            total,
            hasMore: offset + limit < total
        });

    } catch (error) {
        console.error('Error fetching recent activities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recent activities' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/recent-activities:
 *   post:
 *     summary: Create a new activity log
 *     description: Log a new user activity
 *     tags:
 *       - Recent Activities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - entity_type
 *               - title
 *             properties:
 *               action:
 *                 type: string
 *                 description: The action performed (create, update, delete, assign, etc.)
 *               entity_type:
 *                 type: string
 *                 description: The type of entity (project, task, risk, rfq, etc.)
 *               entity_id:
 *                 type: integer
 *                 description: The ID of the entity acted upon
 *               title:
 *                 type: string
 *                 description: Human readable title for the activity
 *               description:
 *                 type: string
 *                 description: Additional details about the activity
 *               metadata:
 *                 type: object
 *                 description: Additional metadata (entity names, old/new values, etc.)
 *     responses:
 *       201:
 *         description: Activity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity_id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    try {
        const user = await getUserFromHeaders();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, entity_type, entity_id, title, description, metadata } = body;

        // Validate required fields
        if (!action || !entity_type || !title) {
            return NextResponse.json(
                { error: 'Missing required fields: action, entity_type, title' },
                { status: 400 }
            );
        }

        // Create the activity
        const activity = await prisma.recentActivity.create({
            data: {
                user_id: user.userId,
                action,
                entity_type,
                entity_id: entity_id ? parseInt(entity_id) : null,
                title,
                description: description || null,
                metadata: metadata || null,
            }
        });

        return NextResponse.json(
            { 
                activity_id: activity.activity_id,
                message: 'Activity logged successfully' 
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error creating activity:', error);
        return NextResponse.json(
            { error: 'Failed to create activity' },
            { status: 500 }
        );
    }
}
