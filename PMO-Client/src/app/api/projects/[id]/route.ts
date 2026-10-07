import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     description: Retrieves a specific project by its ID with WBS structures and WBS items. Can filter tasks by current user.
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve
 *         schema:
 *           type: integer
 *       - in: query
 *         name: myTasks
 *         required: false
 *         description: If true, only returns tasks assigned to the current user
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Project retrieved successfully with WBS and WBS items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_id:
 *                   type: integer
 *                 project_code:
 *                   type: string
 *                 portfolio_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 planned_end_date:
 *                   type: string
 *                   format: date
 *                 actual_end_date:
 *                   type: string
 *                   format: date
 *                 status:
 *                   type: string
 *                 progress_percentage:
 *                   type: number
 *                   format: float
 *                 budget_amount:
 *                   type: number
 *                   format: float
 *                 actual_cost:
 *                   type: number
 *                   format: float
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 wbs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       wbs_id:
 *                         type: integer
 *                       wbs_code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       level:
 *                         type: integer
 *                       progress_percentage:
 *                         type: number
 *                         format: float
 *                       parent_wbs_id:
 *                         type: integer
 *                       children:
 *                         type: array
 *                         items:
 *                           type: object
 *                       parent:
 *                         type: object
 *                       wbsItems:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             wbs_item_id:
 *                               type: integer
 *                             wbs_item_code:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             start_date:
 *                               type: string
 *                               format: date
 *                             end_date:
 *                               type: string
 *                               format: date
 *                             budget_amount:
 *                               type: number
 *                               format: float
 *                             actual_cost:
 *                               type: number
 *                               format: float
 *                             progress_percentage:
 *                               type: number
 *                               format: float
 *                 type:
 *                   type: string
 *                   description: Project type (enum)
 *                 size:
 *                   type: number
 *                   description: Project size in m2
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    
    try {
        const projectId = parseInt(id, 10);
        
        // Get current user information
        const currentUser = await getUserFromHeaders();
        
        // Parse query parameters
        const url = new URL(req.url);
        const filterMyTasks = url.searchParams.get('myTasks') === 'true';

        const project = await prisma.project.findUnique({
            where: { project_id: projectId },
            include: {
                eps: true,
                portfolio: true,
                budgets: {
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 1 // Get the latest budget
                },
                risks: {
                    include: {
                        mitigations: true
                    }
                },
                creator: {
                    include: {
                        account: true
                    }
                },
                manager:{
                    include:{
                        account: true
                    }
                },
                team_members: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                role_id: true,
                                username: true,
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
                documents: {
                    include: {
                        uploader: {
                            select: {
                                account_id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                wbs: {
                    include: {
                        tasks: {
                            where: filterMyTasks ? {
                                assigned_users: {
                                    some: {
                                        user_id: currentUser.userId
                                    }
                                }
                            } : undefined,
                            include: {
                                budgets: {
                                    select: {
                                        planned_amount: true,
                                        actual_amount: true
                                    }
                                },
                                assigned_users: {
                                    include: {
                                        user: {
                                            select: {
                                                user_id: true,
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
                                resourceAssignments: {
                                    include: {
                                        resource: true
                                    }
                                },
                                // CORRECT: Get dependencies where THIS task is the SUCCESSOR
                                // (i.e., tasks that THIS task depends on)
                                successor_dependencies: {
                                    include: {
                                        predecessor: {
                                            select: {
                                                task_id: true,
                                                name: true,
                                                status: true,
                                                progress_percentage: true,
                                                end_date: true
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
                },
                closure_documents: {
                    include: {
                        document: {
                            select: {
                                document_id: true,
                                name: true,
                                file_path: true,
                                file_type: true,
                                size: true
                            }
                        }
                    }
                },
                closure_checklists: {
                    include: {
                        completedBy: {
                            select: {
                                user_id: true,
                                username: true,
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
                punch_list_items: {
                    include: {
                        assignee: {
                            select: {
                                user_id: true,
                                username: true,
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
                final_inspection: {
                    include: {
                        inspector: {
                            select: {
                                user_id: true,
                                username: true,
                                account: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        },
                        submitter: {
                            select: {
                                user_id: true,
                                username: true,
                                account: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        },
                        approver: {
                            select: {
                                user_id: true,
                                username: true,
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
                handover: {
                    include: {
                        handover_user: {
                            select: {
                                user_id: true,
                                username: true,
                                account: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        },
                        handover_receipt: {
                            select: {
                                document_id: true,
                                name: true,
                                file_path: true,
                                file_type: true,
                                size: true
                            }
                        },
                        submitter: {
                            select: {
                                user_id: true,
                                username: true,
                                account: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        },
                        approver: {
                            select: {
                                user_id: true,
                                username: true,
                                account: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        }
                    },
                },
                closure_approved_user: {
                    select: {
                        user_id: true,
                        username: true,
                        account: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!project) {
            return NextResponse.json({ error: 'Project does not exist!' }, { status: 404 });
        }

        // Calculate SPI and CPI
        const calculatePerformanceIndices = () => {
            const plannedBudget = project.budget_amount || 0;
            const actualCost = project.actual_cost || 0;
            const plannedProgress = project.progress_percentage || 0;
            const actualProgress = project.progress_percentage || 0;
            
            // Get planned duration and actual duration
            const plannedStartDate = project.start_date;
            const plannedEndDate = project.planned_end_date;
            const actualStartDate = (project as any).actual_start_date;
            const actualEndDate = project.actual_end_date;
            const currentDate = new Date();
            
            // Calculate planned duration (in days)
            let plannedDuration = 0;
            if (plannedStartDate && plannedEndDate) {
                plannedDuration = Math.ceil((new Date(plannedEndDate).getTime() - new Date(plannedStartDate).getTime()) / (1000 * 60 * 60 * 24));
            }
            
            // Calculate actual duration (in days)
            let actualDuration = 0;
            if (actualStartDate) {
                const endDate = actualEndDate || currentDate;
                actualDuration = Math.ceil((new Date(endDate).getTime() - new Date(actualStartDate).getTime()) / (1000 * 60 * 60 * 24));
            }
            
            // Calculate Earned Value (EV) - Budgeted Cost of Work Performed
            const earnedValue = (plannedBudget * actualProgress) / 100;
            
            // Calculate Planned Value (PV) - Budgeted Cost of Work Scheduled
            const plannedValue = (plannedBudget * plannedProgress) / 100;
            
            // Calculate Actual Cost (AC) - Actual Cost of Work Performed
            const actualCostValue = actualCost;
            
            // Calculate Schedule Performance Index (SPI)
            let spi = 0;
            if (plannedValue > 0) {
                spi = earnedValue / plannedValue;
            }
            
            // Calculate Cost Performance Index (CPI)
            let cpi = 0;
            if (actualCostValue > 0) {
                cpi = earnedValue / actualCostValue;
            }
            
            // Calculate Schedule Variance (SV)
            const scheduleVariance = earnedValue - plannedValue;
            
            // Calculate Cost Variance (CV)
            const costVariance = earnedValue - actualCostValue;
            
            // Calculate Schedule Variance Percentage (SV%)
            let scheduleVariancePercentage = 0;
            if (plannedValue > 0) {
                scheduleVariancePercentage = (scheduleVariance / plannedValue) * 100;
            }
            
            // Calculate Cost Variance Percentage (CV%)
            let costVariancePercentage = 0;
            if (actualCostValue > 0) {
                costVariancePercentage = (costVariance / actualCostValue) * 100;
            }
            
            // Determine performance status
            const getPerformanceStatus = (index: number, type: 'schedule' | 'cost') => {
                if (index >= 1.0) {
                    return type === 'schedule' ? 'Ahead of Schedule' : 'Under Budget';
                } else if (index >= 0.9) {
                    return type === 'schedule' ? 'On Schedule' : 'On Budget';
                } else {
                    return type === 'schedule' ? 'Behind Schedule' : 'Over Budget';
                }
            };
            
            return {
                spi: {
                    value: parseFloat(spi.toFixed(3)),
                    status: getPerformanceStatus(spi, 'schedule'),
                    interpretation: spi >= 1.0 ? 'Project is ahead of schedule' : 
                                   spi >= 0.9 ? 'Project is on schedule' : 'Project is behind schedule'
                },
                cpi: {
                    value: parseFloat(cpi.toFixed(3)),
                    status: getPerformanceStatus(cpi, 'cost'),
                    interpretation: cpi >= 1.0 ? 'Project is under budget' : 
                                   cpi >= 0.9 ? 'Project is on budget' : 'Project is over budget'
                },
                earnedValue: parseFloat(earnedValue.toFixed(2)),
                plannedValue: parseFloat(plannedValue.toFixed(2)),
                actualCost: parseFloat(actualCostValue.toFixed(2)),
                scheduleVariance: parseFloat(scheduleVariance.toFixed(2)),
                costVariance: parseFloat(costVariance.toFixed(2)),
                scheduleVariancePercentage: parseFloat(scheduleVariancePercentage.toFixed(2)),
                costVariancePercentage: parseFloat(costVariancePercentage.toFixed(2)),
                plannedDuration: plannedDuration,
                actualDuration: actualDuration,
                durationVariance: actualDuration - plannedDuration
            };
        };

        // Transform project to include all tasks and performance indices
        const projectWithTasks = {
            ...project,
            tasks: (project as any).wbs.flatMap((wbs: any) => wbs.tasks || []),
            performanceIndices: calculatePerformanceIndices()
        };

        // 🔍 DEBUG: Log task dependencies from project API
        console.log('\n=== PROJECT API - TASK DEPENDENCIES DEBUG ===');
        console.log('📦 Project:', project.name, '(ID:', project.project_id, ')');
        console.log('📋 Total tasks:', projectWithTasks.tasks.length);
        projectWithTasks.tasks.forEach((task: any) => {
            console.log(`\n  Task: ${task.name} (ID: ${task.task_id})`);
            console.log(`    Status: ${task.status}`);
            if (task.successor_dependencies && task.successor_dependencies.length > 0) {
                console.log(`    ✅ Has ${task.successor_dependencies.length} dependencies (tasks it depends on):`);
                task.successor_dependencies.forEach((dep: any) => {
                    console.log(`      - Depends on: ${dep.predecessor.name} (ID: ${dep.predecessor_task_id}) [${dep.dependency_type}]`);
                });
            } else {
                console.log(`    ⚠️  No dependencies (this task doesn't depend on anything)`);
            }
        });
        console.log('=== END PROJECT API DEBUG ===\n');
        
        return NextResponse.json(projectWithTasks, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     description: Updates an existing project by ID. Automatically sets actual_end_date when status is set to completed
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               portfolio_id:
 *                 type: integer
 *                 description: ID of the portfolio this project belongs to
 *               name:
 *                 type: string
 *                 description: Name of the project
 *               description:
 *                 type: string
 *                 description: Description of the project
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Planned start date
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Planned end date
 *               actual_start_date:
 *                 type: string
 *                 format: date
 *                 description: Actual start date
 *               status:
 *                 type: string
 *                 description: Project status (automatically sets actual_end_date if 'completed')
 *               progress_percentage:
 *                 type: number
 *                 format: float
 *                 description: Project completion percentage
 *               budget_amount:
 *                 type: number
 *                 format: float
 *                 description: Planned budget amount
 *               actual_cost:
 *                 type: number
 *                 format: float
 *                 description: Actual cost incurred
 *               type:
 *                 type: string
 *                 description: Project type (enum)
 *               size:
 *                 type: number
 *                 description: Project size in m2
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *                 type:
 *                   type: string
 *                   description: Project type (enum)
 *                 size:
 *                   type: number
 *                   description: Project size in m2
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    
    try {
        const projectId = parseInt(id, 10);
        const entry = await req.json(); 
        
        // Convert date strings to Date objects
        if (entry.start_date) {
            entry.start_date = new Date(entry.start_date);
        }
        if (entry.planned_end_date) {
            entry.planned_end_date = entry.planned_end_date ? new Date(entry.planned_end_date) : null;
        }
        
        // Validate dates: end date cannot be the same as or before start date
        if (entry.start_date && entry.planned_end_date) {
            const start = new Date(entry.start_date);
            const end = entry.planned_end_date ? new Date(entry.planned_end_date) : new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            if (end.getTime() <= start.getTime()) {
                return NextResponse.json(
                    { error: 'End date must be after start date' },
                    { status: 400 }
                );
            }
        }
        
        if (entry.budget_amount) {
            entry.budget_amount = parseFloat(entry.budget_amount);
        }
        
        if (entry.status === 'completed') {
            entry.actual_end_date = new Date(); // Set actual_end_date to current date
        }

        if (entry.size) {
            entry.size = parseFloat(entry.size);
        }
        if (entry.type) {
            entry.type = entry.type;
        }
        
        // Fetch existing project for change detection
        const existingProject = await prisma.project.findUnique({
            where: { project_id: projectId },
            include: { team_members: { select: { user_id: true } } }
        });

        const updatedEntry = await prisma.project.update({
            where: { project_id: projectId },
            data: entry
        });

        // Notify stakeholders if name, description or portfolio changed
        if (existingProject) {
            const nameChanged = entry.name && entry.name !== existingProject.name;
            const descChanged = entry.description && entry.description !== existingProject.description;
            const portChanged = entry.portfolio_id && entry.portfolio_id !== existingProject.portfolio_id;
            if (nameChanged || descChanged || portChanged) {
                const parts = [];
                if (nameChanged) parts.push(`name to "${updatedEntry.name}"`);
                if (descChanged) parts.push('description');
                if (portChanged) parts.push('portfolio');
                const changeDesc = parts.join(', ');
                const stakeholders = Array.from(new Set([
                    existingProject.manager_id,
                    existingProject.created_by,
                    ...existingProject.team_members.map(tm => tm.user_id)
                ]));
                for (const uid of stakeholders) {
                    await prisma.notification.create({
                        data: {
                            user_id: uid,
                            type: 'PROJECT_UPDATE',
                            title: 'Project Updated',
                            message: `Project "${updatedEntry.name}" updated: ${changeDesc}.`,
                            priority: 'MEDIUM',
                            created_by_id: (await getUserFromHeaders()).userId,
                            metadata: { project_id: projectId }
                        }
                    });
                }
            }
        }
        
        return NextResponse.json(updatedEntry, { status: 200 });
    } catch (error: any) {
        console.error('Error updating project:', error);
        return NextResponse.json({
            error: 'Failed to update project',
            details: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
};

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     description: Deletes a project by ID
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    try {
        const projectId = parseInt(id, 10);

        // Validate project ID
        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: 'Invalid project ID format' },
                { status: 400 }
            );
        }

        // Check if project exists and get its dependencies
        const existingProject = await prisma.project.findUnique({
            where: { project_id: projectId },
            include: {
                wbs: {
                    include: {
                        wbsItems: true,
                        children: true,
                        tasks: {
                            include: {
                                assigned_users: true,
                                resourceAssignments: true,
                                predecessor_dependencies: true,
                                successor_dependencies: true,
                                trigger_rules: true,
                                action_rules: true,
                                PerformanceMetric: true,
                                Scorecard: true,
                                Escalation: true
                            }
                        },
                        recurring_tasks: true
                    }
                },
                risks: {
                    include: {
                        mitigations: true
                    }
                },
                budgets: true,
                documents: true,
                lessons: true,
                baselines: true,
                evms: true,
                procurements: {
                    include: {
                        contracts: true
                    }
                },
                Transaction: true,
                Alert: true,
                sites: {
                    include: {
                        equipment_logs: true
                    }
                },
                team_members: true
            }
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: `Project with ID ${projectId} not found` },
                { status: 404 }
            );
        }

        // Delete all dependent records first
        // Increase timeout to 60 seconds for large deletions
        await prisma.$transaction(async (tx: any) => {
            // Get all schedule IDs linked to this project
            const schedules = await tx.projectSchedule.findMany({
                where: { project_id: projectId },
                select: { schedule_id: true }
            });
            const scheduleIds = schedules.map((s: any) => s.schedule_id);
            
            // Delete ProjectSchedule-related data first (before deleting schedules)
            if (scheduleIds.length > 0) {
                // Get all task IDs for these schedules
                const scheduleTasks = await tx.scheduleTask.findMany({
                    where: { schedule_id: { in: scheduleIds } },
                    select: { task_id: true }
                });
                const scheduleTaskIds = scheduleTasks.map((t: any) => t.task_id);
                
                // Get all WBS IDs for these schedules
                const scheduleWBS = await tx.scheduleWBS.findMany({
                    where: { schedule_id: { in: scheduleIds } },
                    select: { wbs_id: true }
                });
                const scheduleWBSIds = scheduleWBS.map((w: any) => w.wbs_id);
                
                // Delete schedule-related data in proper order
                if (scheduleTaskIds.length > 0) {
                    await Promise.all([
                        tx.scheduleTaskAssignment.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
                        tx.scheduleTaskDependency.deleteMany({
                            where: {
                                OR: [
                                    { predecessor_task_id: { in: scheduleTaskIds } },
                                    { successor_task_id: { in: scheduleTaskIds } }
                                ]
                            }
                        }),
                        tx.scheduleAssignment.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
                        tx.scheduleRiskMitigation.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
                    ]);
                }
                
                // Delete schedule-level data
                await Promise.all([
                    tx.scheduleTask.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleWBS.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleBudget.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleRisk.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleTeamMember.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleProcurement.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleSite.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleConflict.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                    tx.scheduleApproval.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
                ]);
                
                // Now delete the schedules themselves
                await tx.projectSchedule.deleteMany({ where: { project_id: projectId } });
            }

            // First delete task-related records
            for (const wbs of existingProject.wbs) {
                for (const task of wbs.tasks) {
                    // Delete task dependencies
                    await tx.taskDependency.deleteMany({
                        where: {
                            OR: [
                                { predecessor_task_id: task.task_id },
                                { successor_task_id: task.task_id }
                            ]
                        }
                    });

                    // Delete task assignments
                    await tx.taskAssignment.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete field data records for this task
                    await tx.fieldData.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete resource assignments
                    await tx.resourceAssignment.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete performance metrics
                    await tx.performanceMetric.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete scorecards
                    await tx.scorecard.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete escalations
                    await tx.escalation.deleteMany({
                        where: { task_id: task.task_id }
                    });

                    // Delete workflow rules
                    await tx.workflowRule.deleteMany({
                        where: {
                            OR: [
                                { trigger_task_id: task.task_id },
                                { action_target_id: task.task_id }
                            ]
                        }
                    });
                }

                // Delete tasks
                await tx.task.deleteMany({
                    where: { wbs_id: wbs.wbs_id }
                });

                // Delete recurring tasks
                await tx.recurringTask.deleteMany({
                    where: { wbs_id: wbs.wbs_id }
                });
            }

            // Delete WBS items
            for (const wbs of existingProject.wbs) {
                await tx.wBSItem.deleteMany({
                    where: { wbs_id: wbs.wbs_id }
                });
            }

            // Delete WBS structures
            await tx.wBS.deleteMany({
                where: { project_id: projectId }
            });

            // Delete risk mitigations first
            for (const risk of existingProject.risks) {
                await tx.riskMitigation.deleteMany({
                    where: { risk_id: risk.risk_id }
                });
            }

            // Delete risks
            await tx.risk.deleteMany({
                where: { project_id: projectId }
            });

            // Delete other dependent records
            await tx.budget.deleteMany({
                where: { project_id: projectId }
            });

            await tx.document.deleteMany({
                where: { project_id: projectId }
            });

            await tx.lesson.deleteMany({
                where: { project_id: projectId }
            });

            await tx.baseline.deleteMany({
                where: { project_id: projectId }
            });

            await tx.eVM.deleteMany({
                where: { project_id: projectId }
            });

            // Delete procurement-related records first
            for (const procurement of existingProject.procurements) {
                // Delete RFQ responses first (they reference procurement)
                await tx.rFQResponse.deleteMany({
                    where: { procurement_id: procurement.procurement_id }
                });
                
                // Delete contracts (they reference procurement)
                await tx.contract.deleteMany({
                    where: { procurement_id: procurement.procurement_id }
                });
            }

            // Delete procurements
            await tx.procurement.deleteMany({
                where: { project_id: projectId }
            });

            await tx.transaction.deleteMany({
                where: { project_id: projectId }
            });

            await tx.alert.deleteMany({
                where: { project_id: projectId }
            });

            await tx.approval.deleteMany({
                where: { project_id: projectId }
            });

            // Delete equipment site logs before deleting sites
            for (const site of existingProject.sites) {
                await tx.equipmentSiteLog.deleteMany({
                    where: { site_id: site.site_id }
                });
            }

            // Delete sites
            await tx.site.deleteMany({
                where: { project_id: projectId }
            });

            // Delete team members
            await tx.projectTeamMember.deleteMany({
                where: { project_id: projectId }
            });

            // Delete timesheets and time entries for this project
            const timesheets = await tx.timesheet.findMany({
                where: { project_id: projectId },
                select: { timesheet_id: true }
            });
            const timesheetIds = timesheets.map((t: any) => t.timesheet_id);
            
            if (timesheetIds.length > 0) {
                // Delete time entries first
                await tx.timeEntry.deleteMany({
                    where: { timesheet_id: { in: timesheetIds } }
                });
                // Then delete timesheets
                await tx.timesheet.deleteMany({
                    where: { project_id: projectId }
                });
            }

            // Delete ProjectSetup
            await tx.projectSetup.deleteMany({
                where: { project_id: projectId }
            });

            // Delete ProjectApproval
            await tx.projectApproval.deleteMany({
                where: { project_id: projectId }
            });

            // Delete closure-related items
            await Promise.all([
                tx.closureDocumentItem.deleteMany({ where: { project_id: projectId } }),
                tx.closureChecklistItem.deleteMany({ where: { project_id: projectId } }),
                tx.punchListItem.deleteMany({ where: { project_id: projectId } }),
                tx.finalInspection.deleteMany({ where: { project_id: projectId } }),
                tx.handover.deleteMany({ where: { project_id: projectId } }),
            ]);

            // Delete project assignments and checklists
            await Promise.all([
                tx.projectAssignment.deleteMany({ where: { projectId: projectId } }),
                tx.projectChecklist.deleteMany({ where: { project_id: projectId } }),
            ]);

            // Finally delete the project
            await tx.project.delete({
                where: { project_id: projectId }
            });
        }, {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 60000, // Maximum time the transaction can run (60 seconds)
        });

        // Get counts of deleted items
        const deletedCounts = {
            wbs: existingProject.wbs.length,
            risks: existingProject.risks.length,
            budgets: existingProject.budgets.length,
            documents: existingProject.documents.length,
            lessons: existingProject.lessons.length,
            baselines: existingProject.baselines.length,
            evms: existingProject.evms.length,
            procurements: existingProject.procurements.length,
            transactions: existingProject.Transaction.length,
            alerts: existingProject.Alert.length,
            sites: existingProject.sites.length,
            teamMembers: existingProject.team_members.length
        };

        return NextResponse.json({
            message: `Project "${existingProject.name}" has been successfully deleted`,
            deletedItems: {
                project: {
                    id: existingProject.project_id,
                    name: existingProject.name
                },
                dependencies: deletedCounts
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error deleting project:', error);

        // Handle specific Prisma errors
        if (error.code === 'P2003') {
            return NextResponse.json({
                error: 'Cannot delete project because it has related records',
                details: 'This project has associated records that must be deleted first'
            }, { status: 409 });
        }

        if (error.code === 'P2025') {
            return NextResponse.json({
                error: 'Project not found',
                details: 'The project you are trying to delete does not exist'
            }, { status: 404 });
        }

        // Handle any other errors
        return NextResponse.json({
            error: 'Failed to delete project',
            details: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}