import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/projects/archive:
 *   post:
 *     summary: Archive multiple projects
 *     description: Archive multiple projects by setting their archived status to true
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_ids
 *             properties:
 *               project_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of project IDs to archive
 *     responses:
 *       200:
 *         description: Projects archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 archived_count:
 *                   type: integer
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    // Get user from headers for authentication
    const user = await getUserFromHeaders();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { project_ids } = body;

    if (!project_ids || !Array.isArray(project_ids) || project_ids.length === 0) {
      return NextResponse.json(
        { error: 'project_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate that all project_ids are numbers
    if (!project_ids.every(id => typeof id === 'number' && id > 0)) {
      return NextResponse.json(
        { error: 'All project_ids must be positive numbers' },
        { status: 400 }
      );
    }

    // Archive the projects
    const result = await prisma.project.updateMany({
      where: {
        project_id: {
          in: project_ids
        },
        archived: false // Only archive projects that aren't already archived
      },
      data: {
        archived: true,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      message: `Successfully archived ${result.count} project(s)`,
      archived_count: result.count
    });

  } catch (error) {
    console.error('Error archiving projects:', error);
    return NextResponse.json(
      { error: 'Failed to archive projects' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/projects/archive:
 *   put:
 *     summary: Unarchive multiple projects
 *     description: Unarchive multiple projects by setting their archived status to false
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_ids
 *             properties:
 *               project_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of project IDs to unarchive
 *     responses:
 *       200:
 *         description: Projects unarchived successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function PUT(request: Request) {
  try {
    // Get user from headers for authentication
    const user = await getUserFromHeaders();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { project_ids } = body;

    if (!project_ids || !Array.isArray(project_ids) || project_ids.length === 0) {
      return NextResponse.json(
        { error: 'project_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Unarchive the projects
    const result = await prisma.project.updateMany({
      where: {
        project_id: {
          in: project_ids
        },
        archived: true // Only unarchive projects that are currently archived
      },
      data: {
        archived: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      message: `Successfully unarchived ${result.count} project(s)`,
      unarchived_count: result.count
    });

  } catch (error) {
    console.error('Error unarchiving projects:', error);
    return NextResponse.json(
      { error: 'Failed to unarchive projects' },
      { status: 500 }
    );
  }
} 