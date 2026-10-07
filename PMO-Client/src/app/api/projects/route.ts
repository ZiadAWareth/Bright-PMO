import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ActivityLogger } from '@/lib/activity-logger';


/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     description: Retrieve a list of all projects with their WBS structures and WBS items
 *     tags:
 *       - Projects
 *     responses:
 *       200:
 *         description: A list of projects with WBS and WBS items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   project_id:
 *                     type: integer
 *                   project_code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   planned_end_date:
 *                     type: string
 *                     format: date
 *                   actual_end_date:
 *                     type: string
 *                     format: date
 *                   status:
 *                     type: string
 *                   budget_amount:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   progress_percentage:
 *                     type: number
 *                     format: float
 *                   wbs:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         wbs_id:
 *                           type: integer
 *                         wbs_code:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         level:
 *                           type: integer
 *                         progress_percentage:
 *                           type: number
 *                         wbsItems:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               wbs_item_id:
 *                                 type: integer
 *                               wbs_item_code:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               start_date:
 *                                 type: string
 *                                 format: date
 *                               end_date:
 *                                 type: string
 *                                 format: date
 *                               budget_amount:
 *                                 type: number
 *                                 format: float
 *                               actual_cost:
 *                                 type: number
 *                                 format: float
 *                               progress_percentage:
 *                                 type: number
 *                                 format: float
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get('include_archived') === 'true';
	const archivedOnly = searchParams.get('archived_only') === 'true';

	// Build where clause based on query parameters
	let whereClause: any = {};
	
	if (archivedOnly) {
		whereClause.archived = true; // Only archived projects
	} else if (!includeArchived) {
		whereClause.archived = false; // Only non-archived projects (default)
	}
	// If includeArchived is true but archivedOnly is false, fetch all projects

	const allProjects = await prisma.project.findMany({
		where: whereClause,
		include: {
			eps: true,
			portfolio: true,
			// The directory shows setup progress on planning projects, so the
			// seven completion flags come back with the list rather than
			// costing one request per card.
			setup: true,
			creator: {
				include: {
					account: true
				}
			},
			team_members: {
				include: {
					user: {
						select: {
							user_id: true,
							role: {
								select: {
									role_id: true,
									name: true
								}
							},
							account: {
								select: {
									first_name: true,
									last_name: true
								}
							}
						}
					}
				}
			},
			wbs: {
				include: {
					tasks: {
						include: {
							assigned_users: {
								include: {
									user: {
										select: {
											user_id: true,
											account:{
												select: {
													first_name: true,
													last_name: true
												}
											}
										}
									}
								}
							}
						}
					},
					wbsItems: true,
					children: true,
					parent: true
				}
			}
		}
	});

	// Transform projects to include all tasks
	const projectsWithTasks = allProjects.map((project: any) => {
		// Collect all tasks from all WBS in the project
		const projectTasks = project.wbs.flatMap((wbs: any) => wbs.tasks || []);
		
		return {
			...project,
			tasks: projectTasks
		};
	});

	return NextResponse.json(projectsWithTasks);
}

// Function to generate consistent WBS code
function generateWbsCode(level: number, wbsId: number, projectId: number) {
	return `WBS-${level}-${wbsId}-PROJ-${projectId}`;
}

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     description: Create a new project with initial WBS, budget, and approval requirements
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
 *               - eps_level_id
 *               - portfolio_id
 *               - name
 *               - start_date
 *               - must_finish_by_date
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the project
 *               description:
 *                 type: string
 *                 description: Project description
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Project start date
 *               must_finish_by_date:
 *                 type: string
 *                 format: date
 *                 description: Project deadline (must finish by this date)
 *               budget_amount:
 *                 type: number
 *                 description: Initial budget amount
 *               eps_level_id:
 *                 type: integer
 *                 description: ID of the EPS level
 *               portfolio_id:
 *                 type: integer
 *                 description: ID of the portfolio
 *               type:
 *                 type: string
 *                 description: Project type (enum)
 *               size:
 *                 type: number
 *                 description: Project size in m2
 */
export async function POST(req: Request) {
	try {
		const entry = await req.json();
		const { userId, role } = await getUserFromHeaders();
		// console.log('Received project data:', entry);

		// Verify user exists in database
		const userExists = await prisma.user.findUnique({
			where: { user_id: userId }
		});

		
		if (!userExists) {
			console.error('User not found:', userId);
			return NextResponse.json(
				{ error: "User doesn't exist in the database" },
				{ status: 404 }
			);
		}

		if(role !== "PMO" && role !== "ADMIN" && role !== "PJM"){
			console.error('Unauthorized role:', role);
			return NextResponse.json(
				{ error: "Unauthorized role. Only PMO or ADMIN can create projects." },
				{ status: 403 }
			);
		}
		
		// Validate required fields
		if (!entry.eps_level_id || !entry.portfolio_id || !entry.project_manager_id) {
			console.error('Missing required fields:', { eps_level_id: entry.eps_level_id, portfolio_id: entry.portfolio_id, project_manager_id: entry.project_manager_id });
			return NextResponse.json(
				{ error: "Missing required fields: eps_level_id, portfolio_id, and project_manager_id are required" },
				{ status: 400 }
			);
		}

		// Validate must_finish_by_date is provided and after start_date
		if (!entry.must_finish_by_date) {
			return NextResponse.json(
				{ error: "Must finish by date (deadline) is required" },
				{ status: 400 }
			);
		}

		const startDate = new Date(entry.start_date);
		const mustFinishByDate = new Date(entry.must_finish_by_date);
		
		if (mustFinishByDate <= startDate) {
			return NextResponse.json(
				{ error: "Must finish by date must be after start date" },
				{ status: 400 }
			);
		}
		
		// Check if the EPS exists
		const epsExists = await prisma.ePS.findUnique({
			where: { eps_id: parseInt(entry.eps_level_id) }
		});
		
		if (!epsExists) {
			console.error('EPS not found:', entry.eps_level_id);
			return NextResponse.json(
				{ error: "EPS with the provided ID does not exist" },
				{ status: 404 }
			);
		}
		
		// Check if portfolio exists
		const portfolioExists = await prisma.portfolio.findUnique({
			where: { portfolio_id: parseInt(entry.portfolio_id) }
		});
		
		if (!portfolioExists) {
			console.error('Portfolio not found:', entry.portfolio_id);
			return NextResponse.json(
				{ error: "Portfolio with the provided ID does not exist" },
				{ status: 404 }
			);
		}
		
		const generatedProjectCode = "PROJ-" + Date.now() + "-" + entry.eps_level_id + "-" + entry.portfolio_id;

		// Start transaction with increased timeout for complex project creation
		const result = await prisma.$transaction(async (tx) => {
			// Create the project
			const newProject = await tx.project.create({
				data: {
					project_code: generatedProjectCode,
					name: entry.name || "Unnamed Project",
					description: entry.description || "",
					start_date: new Date(entry.start_date),
					planned_end_date: entry.end_date ? new Date(entry.end_date) : null, // This will be calculated from tasks
					must_finish_by_date: new Date(entry.must_finish_by_date), // NEW: Save the deadline
					budget_amount: parseFloat(entry.budget_amount || 0),
					actual_cost: 0,
					progress_percentage: 0,
					created_by: userId,
					eps_level_id: parseInt(entry.eps_level_id),
					portfolio_id: parseInt(entry.portfolio_id),
					client: entry.client || "",
					location: entry.location || "",
					expected_roi: parseFloat(entry.expected_roi || 0),
					priority: entry.priority || "medium",
					strategicValue: entry.strategic_value || "medium",
					type: entry.type,
					size: entry.size ? parseFloat(entry.size) : null,
					manager_id: entry.project_manager_id,
					wbs: {
						create: [
							{
							wbs_code: "TEMP_CODE",
							name: 'Root WBS',
							description: 'Project Management Activities',
							level: 0,
							progress_percentage: 0,
							start_date: new Date(entry.start_date),
							end_date: null, // Will be calculated from tasks
								wbsItems: {
									create: [
										{
									wbs_item_code: `WBSItem-001-PLANNING`,
									name: 'Project Planning',
									description: 'Initial Project Planning Activities',
									start_date: new Date(entry.start_date),
									end_date: null, // Will be calculated from tasks
									budget_amount: parseFloat(entry.budget_amount || 0) * 0.1,
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
								planned_amount: parseFloat(entry.budget_amount || 0),
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

		// Convert calendarType to off_days array
		let offDays: string[] = [];
		if (entry.calendarType === "custom") {
			// Use custom off days if provided
			offDays = entry.customOffDays || [];
		} else if (entry.calendarType === "5-day") {
			offDays = ["Friday", "Saturday"];
		} else if (entry.calendarType === "6-day") {
			offDays = ["Friday"];
		}
		// 7-day has no off days, so offDays stays empty

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
				off_days: offDays,
			},
		});			// Level 0 WBS update
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
					planned_amount: parseFloat(entry.budget_amount || 0),
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
			for (let index = 0; index < level1Names.length; index++) {
				const name = level1Names[index];
				const wbs = await tx.wBS.create({
					data: {
						name: name,
						level: 1,
						wbs_code: "TEMP_CODE",
						progress_percentage: 0,
						start_date: null, // Will be calculated from tasks
						end_date: null,   // Will be calculated from tasks
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

			// Team members
			let teamMembers = [];
			if (entry.team_members && Array.isArray(entry.team_members) && entry.team_members.length > 0) {
				const teamMemberPromises = entry.team_members.map(async (member: any) => {
					let userId = member.user_id || member.id;
					if (typeof userId === 'string' && userId.startsWith('user_')) {
						userId = parseInt(userId.replace('user_', ''));
					}
					const finalUserId = parseInt(userId?.toString() || '0');
					if (!finalUserId || isNaN(finalUserId)) return null;
					const userExists = await tx.user.findUnique({ where: { user_id: finalUserId } });
					if (!userExists) return null;
					const isProjectManager = entry.project_manager_id && finalUserId === parseInt(entry.project_manager_id.toString());
					const teamMember = await tx.projectTeamMember.create({
						data: {
							project_id: newProject.project_id,
							user_id: finalUserId,
							role: member.role || '',
							department: member.department || '',
							workload: isProjectManager ? 100 : 50,
							is_lead: isProjectManager,
						},
						include: {
							user: { include: { account: true, role: true } }
						}
					});
					return teamMember;
				});
				const results = await Promise.all(teamMemberPromises);
				teamMembers = results.filter(result => result !== null);
			}

			// No notifications at creation — PM is notified only once the project is fully approved
			return { newProject, teamMembers, notifications: [] };
		}, {
			maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
			timeout: 60000, // Maximum time the transaction can run (60 seconds)
		});

		// Uploads use S3 when configured; no local directory needed for new projects.

		// Log the activity
		await ActivityLogger.logProjectActivity(
			userId,
			'create',
			result.newProject.project_id,
			result.newProject.name,
			`Created new project with code ${result.newProject.project_code}`,
			{
				additional_info: {
					budget_amount: result.newProject.budget_amount,
					team_members_count: result.teamMembers.length,
					eps_level_id: result.newProject.eps_level_id,
					portfolio_id: result.newProject.portfolio_id,
					must_finish_by_date: result.newProject.must_finish_by_date
				}
			}
		);

		console.log(`✅ Project created successfully with ID: ${result.newProject.project_id}`);
		console.log(`📅 Project start date: ${new Date(entry.start_date).toISOString()}`);
		console.log(`🎯 Must finish by date: ${new Date(entry.must_finish_by_date).toISOString()}`);
		console.log(`📊 WBS created with nullable dates for bottom-up calculation`);
		console.log(`💰 Budget amount: ${parseFloat(entry.budget_amount || 0)}`);
		console.log(`👥 Team members count: ${result.teamMembers.length}`);

		return NextResponse.json({
			project: {
				...result.newProject,
				team_members: result.teamMembers
			},
			notifications: result.notifications,
			message: "Project created successfully with bottom-up scheduling enabled"
		});
	} catch (error) {
		console.error('Error creating project:', error);
		return NextResponse.json(
			{ error: 'Failed to create project' },
			{ status: 500 }
		);
	}
}