import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/timesheets:
 *   get:
 *     summary: Get all timesheets
 *     description: Retrieve a list of all timesheets for the authenticated user
 *     tags:
 *       - Timesheets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of timesheets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Timesheet'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
export async function GET(req: Request) {
    try {
        const { userId, role } = await getUserFromHeaders(); 
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('project_id');
        const viewAll = searchParams.get('view_all') === 'true';

        // Check if user can view all timesheets: use DB role when view_all is requested
        // so we don't depend on JWT role (IdP may send different role names than PMO)
        let canViewAnyTimesheet = ['ADMIN', 'PMO', 'PJM'].includes(role);
        if (viewAll && !canViewAnyTimesheet) {
            const userWithRole = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { role: { select: { name: true } } },
            });
            const dbRoleName = userWithRole?.role?.name?.toUpperCase();
            canViewAnyTimesheet = dbRoleName ? ['ADMIN', 'PMO', 'PJM'].includes(dbRoleName) : false;
        }

        // Build where clause
        const whereClause: any = {};

        // If viewAll is requested and user has permission, don't filter by user_id
        if (!(viewAll && canViewAnyTimesheet)) {
            whereClause.user_id = userId;
        }

        if (projectId) {
            whereClause.project_id = parseInt(projectId);
        }

        const timesheets = await prisma.timesheet.findMany({
            where: whereClause,
            include: {
                time_entries: true,
                project: true,
                user: {
                    include: {
                        account: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return NextResponse.json(timesheets);
    } catch (error) {
        console.error('Error fetching timesheets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch timesheets' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/timesheets:
 *   post:
 *     summary: Create a new timesheet
 *     description: Create a new timesheet for the authenticated user
 *     tags:
 *       - Timesheets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - start_date
 *               - end_date
 *             properties:
 *               project_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Timesheet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Timesheet'
 *       400:
 *         description: Invalid input data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
export async function POST(req: Request) {
    try {
        const { userId, role } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }
        const data = await req.json();

        if (!data.project_id || !data.start_date || !data.end_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user has admin privileges to create timesheet for others
        const canCreateForOthers = ['ADMIN', 'PMO', 'PJM'].includes(role);
        const targetUserId = data.user_id || userId;

        // If trying to create for another user, check permissions
        if (data.user_id && data.user_id !== userId && !canCreateForOthers) {
            return NextResponse.json(
                { error: 'Unauthorized. Cannot create timesheet for another user.' },
                { status: 403 }
            );
        }

        // Check if target user exists (if creating for another user)
        if (data.user_id && data.user_id !== userId) {
            const targetUser = await prisma.user.findUnique({
                where: { user_id: data.user_id }
            });

            if (!targetUser) {
                return NextResponse.json(
                    { error: 'Target user not found' },
                    { status: 404 }
                );
            }
        }

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { project_id: data.project_id }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Check if timesheet already exists for this user and date range
        const existingTimesheet = await prisma.timesheet.findFirst({
            where: {
                user_id: targetUserId,
                project_id: data.project_id,
                start_date: new Date(data.start_date)
            }
        });

        if (existingTimesheet) {
            return NextResponse.json(
                { error: 'A timesheet already exists for this user, project, and date range' },
                { status: 400 }
            );
        }

        // Create timesheet
        const timesheet = await prisma.timesheet.create({
            data: {
                user_id: targetUserId,
                project_id: data.project_id,
                start_date: new Date(data.start_date),
                end_date: new Date(data.end_date),
                status: data.status || 'DRAFT',
                total_hours: 0,
                comments: data.comments || '',
                created_at: new Date(),
                updated_at: new Date()
            },
            include: {
                project: true,
                user: {
                    include: {
                        account: true,
                        role: true
                    }
                }
            }
        });

        return NextResponse.json(timesheet, { status: 201 });
    } catch (error) {
        console.error('Error creating timesheet:', error);
        return NextResponse.json(
            { error: 'Failed to create timesheet' },
            { status: 500 }
        );
    }
}