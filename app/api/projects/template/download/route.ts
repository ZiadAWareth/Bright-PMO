import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { TemplateGenerator, projectTemplateConfig } from '@/lib/template-utils';

/**
 * @swagger
 * /api/projects/template/download:
 *   get:
 *     summary: Download project template Excel file
 *     description: Generate and download an Excel template for project creation
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
export async function GET() {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can download templates." },
        { status: 403 }
      );
    }

    // Get reference data for dropdowns
    const [portfolios, epsLevels, users] = await Promise.all([
      prisma.portfolio.findMany({
        select: {
          portfolio_id: true,
          name: true,
        }
      }),
      prisma.ePS.findMany({
        select: {
          eps_id: true,
          name: true,
          eps_code: true,
        }
      }),
      prisma.user.findMany({
        where: {
          role: { name: "PJM" } // Only Project Managers
        },
        select: {
          user_id: true,
          username: true,
          account: {
            select: {
              first_name: true,
              last_name: true,
            }
          }
        }
      })
    ]);

    // Create template configuration with reference data
    const templateConfig = {
      ...projectTemplateConfig,
      referenceSheets: [
        {
          name: 'Portfolios',
          data: portfolios.map(p => ({
            'Portfolio ID': p.portfolio_id,
            'Portfolio Name': p.name
          })),
          keyField: 'portfolio_id',
          displayField: 'name'
        },
        {
          name: 'EPS Levels',
          data: epsLevels.map(e => ({
            'EPS ID': e.eps_id,
            'EPS Code': e.eps_code,
            'EPS Name': e.name
          })),
          keyField: 'eps_id',
          displayField: 'name'
        },
        {
          name: 'Project Managers',
          data: users.map(u => ({
            'Manager ID': u.user_id,
            'Username': u.username,
            'Full Name': u.account ? `${u.account.first_name} ${u.account.last_name}` : u.username
          })),
          keyField: 'user_id',
          displayField: 'username'
        }
      ]
    };

    // Generate template
    const generator = new TemplateGenerator(templateConfig);
    const buffer = generator.generateTemplate();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="project_template_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
