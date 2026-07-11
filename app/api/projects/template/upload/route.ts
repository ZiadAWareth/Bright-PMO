import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { TemplateProcessor, projectTemplateConfig } from '@/lib/template-utils';
import { ProjectType, ProjectPriority, ProjectStrategicValue, projectCompliance } from '@prisma/client';

// Function to generate consistent WBS code
function generateWbsCode(level: number, wbsId: number, projectId: number) {
	return `WBS-${level}-${wbsId}-PROJ-${projectId}`;
}

/**
 * @swagger
 * /api/projects/template/upload:
 *   post:
 *     summary: Upload project template Excel file
 *     description: Upload an Excel file with project data to create multiple projects
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing project data
 *     responses:
 *       200:
 *         description: Projects created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 created_projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function POST(req: Request) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can upload templates." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    
    // Process the file using the template processor
    const processor = new TemplateProcessor(projectTemplateConfig);
    const { data: projectsData, errors: processingErrors } = processor.processFile(buffer);

    const createdProjects = [];
    const errors = [...processingErrors];

    // No bulk approver lookup — notifications are sent sequentially as each step is approved

    // Process each validated project
    for (const [index, projectData] of projectsData.entries()) {
      try {
        console.log(`Processing project ${index + 1}:`, {
          name: projectData.name,
          manager_id: projectData.manager_id,
          portfolio_id: projectData.portfolio_id,
          eps_level_id: projectData.eps_level_id
        });

        // Validate references exist
        const [portfolioExists, epsExists, managerExists] = await Promise.all([
          prisma.portfolio.findUnique({ where: { portfolio_id: projectData.portfolio_id } }),
          prisma.ePS.findUnique({ where: { eps_id: projectData.eps_level_id } }),
          prisma.user.findUnique({ 
            where: { 
              user_id: projectData.manager_id
            },
            include: {
              role: true
            }
          })
        ]);

        if (!portfolioExists) {
          errors.push({
            row: index + 2,
            field: 'Portfolio ID',
            error: `Portfolio with ID ${projectData.portfolio_id} does not exist`
          });
          continue;
        }

        if (!epsExists) {
          errors.push({
            row: index + 2,
            field: 'EPS ID',
            error: `EPS with ID ${projectData.eps_level_id} does not exist`
          });
          continue;
        }

        if (!managerExists) {
          errors.push({
            row: index + 2,
            field: 'Project Manager ID',
            error: `Project Manager with ID ${projectData.manager_id} does not exist`
          });
          continue;
        }

        if (managerExists.role.name !== 'PJM') {
          errors.push({
            row: index + 2,
            field: 'Project Manager ID',
            error: `User with ID ${projectData.manager_id} does not have the PJM (Project Manager) role`
          });
          continue;
        }

        // Generate unique project code using the same logic as main API
        const generatedProjectCode = "PROJ-" + Date.now() + "-" + projectData.eps_level_id + "-" + projectData.portfolio_id;

        // Parse funding sources and governance gates for tags
        const fundingSources = projectData.funding_sources 
          ? projectData.funding_sources.split(',').map((source: string) => source.trim()).filter(Boolean)
          : [];

        const governanceGates = projectData.governance_gates 
          ? projectData.governance_gates.split(',').map((gate: string) => gate.trim()).filter(Boolean)
          : [];

        // Combine all metadata into tags
        const tags = [
          ...fundingSources.map((source: string) => `funding:${source}`),
          ...governanceGates.map((gate: string) => `gate:${gate}`),
          `methodology:${projectData.methodology}`,
          `department:${projectData.department}`,
          `size:${projectData.project_size}`,
          `budget_category:${projectData.budget_category}`,
          `reporting:${projectData.governance_reporting_frequency}`
        ].filter(Boolean);

        // Start transaction - using same logic as main project creation API
        const result = await prisma.$transaction(async (tx) => {
          console.log(`Creating project with manager_id: ${projectData.manager_id} for project: ${projectData.name}`);
          
          // Create the project with complete WBS and budget structure
          const newProject = await tx.project.create({
            data: {
              project_code: generatedProjectCode,
              name: projectData.name,
              description: projectData.description,
              start_date: projectData.start_date,
              planned_end_date: projectData.planned_end_date,
              budget_amount: projectData.budget_amount,
              actual_cost: 0,
              progress_percentage: 0,
              created_by: userId,
              eps_level_id: projectData.eps_level_id,
              portfolio_id: projectData.portfolio_id,
              client: projectData.client || "",
              location: projectData.location || "",
              expected_roi: projectData.expected_roi || 0,
              priority: (projectData.priority || 'medium') as ProjectPriority,
              strategicValue: (projectData.strategic_value || 'medium') as ProjectStrategicValue,
              type: projectData.type as ProjectType,
              size: projectData.size || null,
              manager_id: projectData.manager_id,
              tags: tags,
              status: 'planning',
              healthScore: 50,
              riskScore: 0,
              qualityScore: 50,
              wbs: {
                create: [
                  {
                    wbs_code: "TEMP_CODE",
                    name: 'Root WBS',
                    description: 'Project Management Activities',
                    level: 0,
                    progress_percentage: 0,
                    start_date: projectData.start_date,
                    end_date: projectData.planned_end_date,
                    wbsItems: {
                      create: [
                        {
                          wbs_item_code: `WBSItem-001-PLANNING`,
                          name: 'Project Planning',
                          description: 'Initial Project Planning Activities',
                          start_date: projectData.start_date,
                          end_date: projectData.planned_end_date,
                          budget_amount: projectData.budget_amount * 0.1,
                          actual_cost: 0,
                          progress_percentage: 0
                        }
                      ]
                    },
                  },
                ]
              },
              budgets: {
                create: [
                  {
                    cost_type: 'Total Project Budget',
                    planned_amount: projectData.budget_amount,
                    actual_amount: 0,
                    variance: 0,
                    threshold: 0,
                    fiscal_year: new Date().getFullYear(),
                    fiscal_period: 'Q1'
                  }
                ]
              }
            },
            include: {
              wbs: { include: { wbsItems: true } },
              budgets: true
            }
          });

          console.log(`Project created successfully:`, {
            project_id: newProject.project_id,
            project_code: newProject.project_code,
            name: newProject.name,
            manager_id: newProject.manager_id,
            created_by: newProject.created_by
          });

          // Create ProjectSetup
          await tx.projectSetup.create({
            data: {
              project_id: newProject.project_id,
              wbs: false,
              schedule: false,
              budget: false,
              team: false,
              risk: false,
              baseline: false,
              execution: false,
            },
          });

          // Level 0 WBS update
          const level0WBS = await tx.wBS.findFirst({
            where: { project_id: newProject.project_id, level: 0 }
          });
          if (!level0WBS) throw new Error("Level 0 WBS not found");
          const updatedLevel0WBS = await tx.wBS.update({
            where: { wbs_id: level0WBS.wbs_id },
            data: { wbs_code: generateWbsCode(0, level0WBS.wbs_id, newProject.project_id) }
          });
          
          // Level 0 WBS budget
          await tx.budget.create({
            data: {
              project_id: newProject.project_id,
              wbs_id: level0WBS.wbs_id,
              cost_type: 'General',
              planned_amount: projectData.budget_amount,
              actual_amount: 0,
              variance: 0,
              threshold: 0,
              fiscal_year: new Date().getFullYear(),
              fiscal_period: 'Q1'
            }
          });

          // Level 1 WBS creation and update
          const level1Names = ["Design & Planning", "Procurement", "Execution", "Testing & Commissioning", "Handover & Closeout"];
          const level1WBS = [];
          for (let wbsIndex = 0; wbsIndex < level1Names.length; wbsIndex++) {
            const name = level1Names[wbsIndex];
            const wbs = await tx.wBS.create({
              data: {
                name: name,
                level: 1,
                wbs_code: "TEMP_CODE",
                progress_percentage: 0,
                start_date: projectData.start_date,
                end_date: projectData.planned_end_date,
                project: { connect: { project_id: newProject.project_id } },
                parent: { connect: { wbs_id: level0WBS.wbs_id } },
                budgets: {
                  create: [
                    {
                      project_id: newProject.project_id,
                      cost_type: "General",
                      planned_amount: 0,
                      actual_amount: 0,
                      variance: 0,
                      threshold: 0,
                      fiscal_year: new Date().getFullYear(),
                      fiscal_period: "Q1",
                    }
                  ]
                }
              }
            });
            const updatedWbs = await tx.wBS.update({
              where: { wbs_id: wbs.wbs_id },
              data: { wbs_code: generateWbsCode(1, wbs.wbs_id, newProject.project_id) }
            });
            level1WBS.push(updatedWbs);
          }

          // Create project manager as team member
          const teamMember = await tx.projectTeamMember.create({
            data: {
              project_id: newProject.project_id,
              user_id: projectData.manager_id,
              role: 'Project Manager',
              department: projectData.department || '',
              workload: 100,
              is_lead: true,
            },
            include: {
              user: { include: { account: true, role: true } }
            }
          });

          // No notifications at creation — PM is notified only once the project is fully approved
          return { newProject, teamMember, notifications: [] };
        });

        // Uploads use S3 when configured; no local directory needed for new projects.

        createdProjects.push({
          project_id: result.newProject.project_id,
          project_code: result.newProject.project_code,
          name: result.newProject.name,
          row: index + 2,
          team_member: result.teamMember,
          notifications_sent: result.notifications.length
        });

      } catch (error) {
        console.error(`Error creating project ${index + 2}:`, error);
        errors.push({
          row: index + 2,
          field: 'General',
          error: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${createdProjects.length} projects`,
      created_projects: createdProjects,
      errors: errors.map(error => ({
        row: error.row,
        error: `${error.field}: ${error.error}`
      })),
      summary: {
        total_rows: projectsData.length,
        created: createdProjects.length,
        errors: errors.length
      }
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
