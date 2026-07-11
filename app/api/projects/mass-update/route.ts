import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ProjectStatus, ProjectPriority, projectCompliance, ProjectStrategicValue } from '@prisma/client';

/**
 * @swagger
 * /api/projects/mass-update:
 *   post:
 *     summary: Mass update multiple projects
 *     description: Update multiple projects with the same field values
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
 *               - updates
 *             properties:
 *               project_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of project IDs to update
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [planning, execution, completed, on_hold, pending_approval, approved, rejected]
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                   compliance:
 *                     type: string
 *                     enum: [compliant, non_compliant, pending]
 *                   strategicValue:
 *                     type: string
 *                     enum: [high, medium, low]
 *                   portfolio_id:
 *                     type: integer
 *                   eps_level_id:
 *                     type: integer
 *                   location:
 *                     type: string
 *                   client:
 *                     type: string
 *                   contractor:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                 description: Fields to update (only provided fields will be updated)
 *     responses:
 *       200:
 *         description: Projects updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updated_count:
 *                   type: integer
 *                 updated_projects:
 *                   type: array
 *                   items:
 *                     type: object
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
    const { project_ids, updates } = body;

    // Validate request
    if (!project_ids || !Array.isArray(project_ids) || project_ids.length === 0) {
      return NextResponse.json(
        { error: 'project_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty object' },
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

    // Validate enum values if provided
    const validationErrors: string[] = [];

    if (updates.status && !Object.values(ProjectStatus).includes(updates.status)) {
      validationErrors.push(`Invalid status: ${updates.status}`);
    }

    if (updates.priority && !Object.values(ProjectPriority).includes(updates.priority)) {
      validationErrors.push(`Invalid priority: ${updates.priority}`);
    }

    if (updates.compliance && !Object.values(projectCompliance).includes(updates.compliance)) {
      validationErrors.push(`Invalid compliance: ${updates.compliance}`);
    }

    if (updates.strategicValue && !Object.values(ProjectStrategicValue).includes(updates.strategicValue)) {
      validationErrors.push(`Invalid strategicValue: ${updates.strategicValue}`);
    }

    // Validate foreign key references if provided
    if (updates.portfolio_id) {
      const portfolioExists = await prisma.portfolio.findUnique({
        where: { portfolio_id: updates.portfolio_id }
      });
      if (!portfolioExists) {
        validationErrors.push(`Portfolio with ID ${updates.portfolio_id} does not exist`);
      }
    }

    if (updates.eps_level_id) {
      const epsExists = await prisma.ePS.findUnique({
        where: { eps_id: updates.eps_level_id }
      });
      if (!epsExists) {
        validationErrors.push(`EPS with ID ${updates.eps_level_id} does not exist`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation errors', details: validationErrors },
        { status: 400 }
      );
    }

    // Build the update data object
    const updateData: any = {
      updated_at: new Date()
    };

    // Only include fields that are provided and valid
    const allowedFields = [
      'status', 'priority', 'compliance', 'strategicValue', 
      'portfolio_id', 'eps_level_id', 'location', 'client', 
      'contractor', 'tags'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Check if projects exist and are not archived
    const existingProjects = await prisma.project.findMany({
      where: {
        project_id: {
          in: project_ids
        },
        archived: false // Only update non-archived projects
      },
      select: {
        project_id: true,
        name: true,
        project_code: true
      }
    });

    if (existingProjects.length === 0) {
      return NextResponse.json(
        { error: 'No valid projects found to update' },
        { status: 400 }
      );
    }

    const existingProjectIds = existingProjects.map(p => p.project_id);
    const notFoundIds = project_ids.filter(id => !existingProjectIds.includes(id));

    // Perform the mass update
    const result = await prisma.project.updateMany({
      where: {
        project_id: {
          in: existingProjectIds
        }
      },
      data: updateData
    });

    // Fetch updated projects for response
    const updatedProjects = await prisma.project.findMany({
      where: {
        project_id: {
          in: existingProjectIds
        }
      },
      select: {
        project_id: true,
        project_code: true,
        name: true,
        status: true,
        priority: true,
        compliance: true,
        strategicValue: true,
        updated_at: true
      }
    });

    const response: any = {
      message: `Successfully updated ${result.count} project(s)`,
      updated_count: result.count,
      updated_projects: updatedProjects,
      applied_updates: updateData
    };

    // Include warning about projects that weren't found
    if (notFoundIds.length > 0) {
      response.warnings = [
        `${notFoundIds.length} project(s) were not found or are archived: ${notFoundIds.join(', ')}`
      ];
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in mass update:', error);
    return NextResponse.json(
      { error: 'Failed to update projects' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/projects/mass-update:
 *   get:
 *     summary: Get available options for mass update
 *     description: Retrieve available enum values and reference data for mass updates
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available options for mass update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status_options:
 *                   type: array
 *                   items:
 *                     type: string
 *                 priority_options:
 *                   type: array
 *                   items:
 *                     type: string
 *                 compliance_options:
 *                   type: array
 *                   items:
 *                     type: string
 *                 strategic_value_options:
 *                   type: array
 *                   items:
 *                     type: string
 *                 portfolios:
 *                   type: array
 *                   items:
 *                     type: object
 *                 eps_levels:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  try {
    // Get user from headers for authentication
    const user = await getUserFromHeaders();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch reference data
    const [portfolios, epsLevels] = await Promise.all([
      prisma.portfolio.findMany({
        select: {
          portfolio_id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.ePS.findMany({
        select: {
          eps_id: true,
          name: true,
          eps_code: true,
          level: true
        },
        orderBy: [
          { level: 'asc' },
          { name: 'asc' }
        ]
      })
    ]);

    return NextResponse.json({
      status_options: Object.values(ProjectStatus),
      priority_options: Object.values(ProjectPriority),
      compliance_options: Object.values(projectCompliance),
      strategic_value_options: Object.values(ProjectStrategicValue),
      portfolios: portfolios,
      eps_levels: epsLevels,
      updatable_fields: [
        'status', 'priority', 'compliance', 'strategicValue',
        'portfolio_id', 'eps_level_id', 'location', 'client',
        'contractor', 'tags'
      ]
    });

  } catch (error) {
    console.error('Error fetching mass update options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mass update options' },
      { status: 500 }
    );
  }
} 