import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { WBSTemplateGenerator, wbsTemplateConfig } from '@/lib/wbs-template-utils';

/**
 * @swagger
 * /api/projects/{id}/wbs/template/download:
 *   get:
 *     summary: Download WBS template Excel file
 *     description: Generate and download an Excel template for WBS creation with reference data
 *     tags:
 *       - WBS
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to download WBS template for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can download templates." },
        { status: 403 }
      );
    }

    const params = await context.params;
    const projectId = parseInt(params.id);
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: {
        project_id: true,
        name: true,
        project_code: true,
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get existing WBS items for reference (use same ordering as upload validation)
    const existingWBS = await prisma.wBS.findMany({
      where: { project_id: projectId },
      select: {
        wbs_id: true,
        name: true,
        wbs_code: true,
        level: true,
        parent_wbs_id: true,
        status: true,
      },
      orderBy: [
        { level: 'asc' },
        { wbs_code: 'asc' }
      ]
    });

    console.log('Generating template with existing WBS items:', existingWBS);

    // Create template configuration with reference data
    const templateConfig = {
      ...wbsTemplateConfig,
      referenceSheets: [
        {
          name: 'Existing WBS',
          data: existingWBS.map(wbs => ({
            'WBS ID': wbs.wbs_id,
            'WBS Code': wbs.wbs_code,
            'WBS Name': wbs.name,
            'Level': wbs.level,
            'Parent WBS ID': wbs.parent_wbs_id || '', // Ensure null becomes empty string
            'Status': wbs.status
          })),
          keyField: 'wbs_id',
          displayField: 'name'
        }
      ]
    };

    // Generate template
    const generator = new WBSTemplateGenerator(templateConfig);
    const templateBuffer = generator.generateTemplate();

    // Create response with proper headers
    const response = new NextResponse(templateBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="WBS_Template_${project.project_code}_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': templateBuffer.byteLength.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Error generating WBS template:', error);
    return NextResponse.json(
      { error: 'Failed to generate WBS template' },
      { status: 500 }
    );
  }
}
