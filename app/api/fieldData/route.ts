import { getUserFromHeaders } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { weightedProgressAverage } from "@/lib/wbs-progress-utils";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/fieldData:
 *   get:
 *     summary: Get field data entries
 *     description: Get field data entries, optionally filtered by task_id or resource_assignment_id
 *     tags: [Field Data]
 *     parameters:
 *       - in: query
 *         name: task_id
 *         schema:
 *           type: integer
 *         description: Filter by task ID
 *       - in: query
 *         name: resource_assignment_id
 *         schema:
 *           type: integer
 *         description: Filter by resource assignment ID
 *     responses:
 *       200:
 *         description: Field data entries retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(req: Request) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('task_id');
        const resourceAssignmentId = searchParams.get('resource_assignment_id');

        const whereClause: any = {};
        if (taskId) whereClause.task_id = parseInt(taskId);
        if (resourceAssignmentId) whereClause.resource_assignment_id = parseInt(resourceAssignmentId);

        const fieldDataEntries = await prisma.fieldData.findMany({
            where: whereClause,
            include: {
                reporter: {
                    select: {
                        first_name: true,
                        last_name: true,
                        department: true
                    }
                },
                resource_assignment: {
                    include: {
                        resource: {
                            select: {
                                rate: true,
                                name: true,
                                type: true,
                                role: true
                            }
                        }
                    }
                },
                task: {
                    select: {
                        name: true,
                        progress_percentage: true,
                        estimated_hours: true,
                        actual_hours: true
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        return NextResponse.json(fieldDataEntries, { status: 200 });
    } catch (error) {
        console.error('Error fetching field data entries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch field data entries' },
            { status: 500 }
        );
    }
}



/**
 * @swagger
 * /api/fieldData:
 *   post:
 *     summary: Create a new field data entry
 *     description: Create a new field data entry for a specific resource assignment on a task
 *     tags: [Field Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_id
 *               - resource_assignment_id
 *               - actual_progress
 *               - actual_hours
 *               - is_according_to_plan
 *             properties:
 *               task_id:
 *                 type: integer
 *               resource_assignment_id:
 *                 type: integer
 *               actual_progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               actual_hours:
 *                 type: number
 *                 minimum: 0
 *               notes:
 *                 type: string
 *               is_according_to_plan:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Field data entry created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task or resource assignment not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const data = await req.json();

        // Validate required fields
        if (!data.task_id || !data.resource_assignment_id || data.actual_progress === undefined || data.actual_hours === undefined || data.is_according_to_plan === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: task_id, resource_assignment_id, actual_progress, actual_hours, is_according_to_plan' },
                { status: 400 }
            );
        }

        // Validate progress percentage
        if (data.actual_progress < 0 || data.actual_progress > 100) {
            return NextResponse.json(
                { error: 'Actual progress must be between 0 and 100' },
                { status: 400 }
            );
        }

        // Validate actual hours
        if (data.actual_hours < 0) {
            return NextResponse.json(
                { error: 'Actual hours must be non-negative' },
                { status: 400 }
            );
        }

        // Check if task exists and get its dependencies
        const task = await prisma.task.findUnique({
            where: { task_id: data.task_id },
            include: {
                // CORRECT: Get tasks that THIS task depends on
                successor_dependencies: {
                    include: {
                        predecessor: {
                            select: {
                                task_id: true,
                                name: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        // Check if task dependencies are met
        if (task.successor_dependencies && task.successor_dependencies.length > 0) {
            const incompleteDependencies = task.successor_dependencies.filter(dep => {
                switch (dep.dependency_type) {
                    case 'finish_to_start':
                        return dep.predecessor.status !== 'completed';
                    case 'start_to_start':
                        return dep.predecessor.status === 'todo';
                    case 'finish_to_finish':
                        return dep.predecessor.status !== 'completed';
                    case 'start_to_finish':
                        return dep.predecessor.status === 'todo';
                    default:
                        return false;
                }
            });

            if (incompleteDependencies.length > 0) {
                const reasons = incompleteDependencies.map(dep => {
                    switch (dep.dependency_type) {
                        case 'finish_to_start':
                            return `"${dep.predecessor.name}" must be completed first`;
                        case 'start_to_start':
                            return `"${dep.predecessor.name}" must be started first`;
                        case 'finish_to_finish':
                            return `"${dep.predecessor.name}" must be completed before this task can finish`;
                        case 'start_to_finish':
                            return `"${dep.predecessor.name}" must be started before this task can finish`;
                        default:
                            return `"${dep.predecessor.name}" dependency not met`;
                    }
                });

                return NextResponse.json(
                    { 
                        error: 'Task dependencies not met. Cannot add field data.',
                        dependencyIssues: reasons
                    },
                    { status: 400 }
                );
            }
        }

        // Check if resource assignment exists and belongs to the task
        const resourceAssignment = await prisma.resourceAssignment.findUnique({
            where: { assignment_id: data.resource_assignment_id },
            include: {
                resource: {
                    select: {
                        name: true,
                        type: true,
                        role: true
                    }
                }
            }
        });

        if (!resourceAssignment) {
            return NextResponse.json(
                { error: 'Resource assignment not found' },
                { status: 404 }
            );
        }

        if (resourceAssignment.task_id !== data.task_id) {
            return NextResponse.json(
                { error: 'Resource assignment does not belong to the specified task' },
                { status: 400 }
            );
        }

        // Get user's account
        const userAccount = await prisma.account.findUnique({
            where: { user_id: userId }
        });

        if (!userAccount) {
            return NextResponse.json(
                { error: 'User account not found' },
                { status: 404 }
            );
        }

        // Create field data entry and update resource assignment with cumulative progress/hours
        // NOTE: Each field data entry represents incremental progress that gets added to existing totals
        // Increase transaction timeout for complex WBS hierarchy updates
        const [fieldDataEntry, updatedResourceAssignment] = await prisma.$transaction(async (tx) => {
            // Create field data entry
            const entry = await tx.fieldData.create({
                data: {
                    task_id: data.task_id,
                    resource_assignment_id: data.resource_assignment_id,
                    reported_by: userAccount.account_id,
                    actual_progress: data.actual_progress,
                    actual_hours: data.actual_hours,
                    notes: data.notes || null,
                    is_according_to_plan: data.is_according_to_plan,
                    timestamp: new Date()
                },
                include: {
                    reporter: {
                        select: {
                            first_name: true,
                            last_name: true,
                            department: true
                        }
                    },
                    resource_assignment: {
                        include: {
                            resource: {
                                select: {
                                    name: true,
                                    type: true,
                                    role: true
                                }
                            }
                        }
                    },
                    task: {
                        select: {
                            name: true,
                            progress_percentage: true
                        }
                    }
                }
            });

            // Get current resource assignment values
            const currentAssignment = await tx.resourceAssignment.findUnique({
                where: { assignment_id: data.resource_assignment_id },
                select: { actual_hours: true, progress: true }
            });

            if (!currentAssignment) {
                throw new Error('Resource assignment not found');
            }

            // Calculate cumulative values by adding to existing values
            const newTotalHours = currentAssignment.actual_hours + data.actual_hours;
            const potentialProgress = currentAssignment.progress + data.actual_progress;
            
            // Validate that progress doesn't exceed 100%
            if (potentialProgress > 100) {
                throw new Error(`Adding ${data.actual_progress}% would result in ${potentialProgress}% total progress, which exceeds 100%. Current progress is ${currentAssignment.progress}%.`);
            }
            
            const newTotalProgress = Math.round(potentialProgress);
            
            // Prepare update data
            const updateData: any = {
                actual_hours: newTotalHours,
                progress: newTotalProgress
            };
            
            // Note: Assignment completion tracking will be handled at the UI level
            // since ResourceAssignment model doesn't have completion status fields

            // Update resource assignment with cumulative totals
            const updatedAssignment = await tx.resourceAssignment.update({
                where: { assignment_id: data.resource_assignment_id },
                data: updateData
            });

            // Update task progress and actual hours based on all resource assignments
            const resourceAssignments = await tx.resourceAssignment.findMany({
                where: { task_id: data.task_id },
                select: {
                    progress: true,
                    allocation_percentage: true,
                    actual_hours: true,
                    resource: {
                        select: {
                            rate: true
                        }
                    }
                }
            });

            let taskProgress = 0;
            let totalActualHours = 0;
            let totalActualCost = 0;
            
            if (resourceAssignments.length > 0) {
                // Calculate weighted progress based on allocation percentage
                const totalAllocation = resourceAssignments.reduce((sum, assignment) => sum + assignment.allocation_percentage, 0);
                
                if (totalAllocation > 0) {
                    const weightedProgress = resourceAssignments.reduce((sum, assignment) => {
                        const weight = assignment.allocation_percentage / totalAllocation;
                        return sum + (assignment.progress * weight);
                    }, 0);
                    taskProgress = Math.round(weightedProgress);
                }
                
                // Calculate total actual hours and cost from all resource assignments
                totalActualHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.actual_hours, 0);
                totalActualCost = resourceAssignments.reduce((sum, assignment) => {
                    return sum + (assignment.actual_hours * (assignment.resource?.rate || 0));
                }, 0);
            }

            // Prepare task update data
            const taskUpdateData: any = { 
                progress_percentage: taskProgress,
                actual_hours: totalActualHours
            };
            
            // Auto-complete task when it reaches 100%
            if (taskProgress >= 100) {
                taskUpdateData.status = 'completed';
                taskUpdateData.actual_end_date = new Date();
            }

            await tx.task.update({
                where: { task_id: data.task_id },
                data: taskUpdateData
            });

            // Update task budget with actual cost
            await updateTaskBudgetActualCost(tx, data.task_id, totalActualCost);

            // Update WBS hierarchy progress - each task has equal weight for the WBS
            const task = await tx.task.findUnique({
                where: { task_id: data.task_id },
                select: { wbs_id: true }
            });

            if (task?.wbs_id) {
                try {
                    await updateWBSHierarchy(tx, task.wbs_id);
                } catch (wbsError) {
                    console.error('Warning: WBS hierarchy update failed, but field data was saved:', wbsError);
                    // Don't throw - the field data was already created successfully
                }
            }

            return [entry, updatedAssignment];
        }, {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 15000, // Maximum time for the transaction to complete (15 seconds)
        });

        return NextResponse.json(fieldDataEntry, { status: 201 });
    } catch (error) {
        console.error('Error creating field data entry:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('Transaction')) {
                return NextResponse.json(
                    { 
                        error: 'Transaction timeout - the operation took too long. Please try again.',
                        details: error.message 
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { 
                    error: 'Failed to create field data entry',
                    details: error.message 
                },
                { status: 500 }
            );
        }
        
        return NextResponse.json(
            { error: 'Failed to create field data entry' },
            { status: 500 }
        );
    }
}

/**
 * Updates the task budget's actual_amount with the calculated cost and cascades cost updates up the WBS hierarchy
 */
async function updateTaskBudgetActualCost(tx: any, taskId: number, actualCost: number): Promise<void> {
    // Update or create task budget entry
    const existingTaskBudget = await tx.budget.findFirst({
        where: { 
            task_id: taskId 
        }
    });

    if (existingTaskBudget) {
        // Update existing task budget
        await tx.budget.update({
            where: { budget_id: existingTaskBudget.budget_id },
            data: { 
                actual_amount: actualCost,
                variance: existingTaskBudget.planned_amount - actualCost
            }
        });
    } else {
        // Create new task budget entry if it doesn't exist
        const task = await tx.task.findUnique({
            where: { task_id: taskId },
            select: { wbs_id: true, wbs: { select: { project_id: true } } }
        });

        if (task) {
            await tx.budget.create({
                data: {
                    project_id: task.wbs.project_id,
                    task_id: taskId,
                    cost_type: 'TASK_ACTUAL',
                    planned_amount: 0, // Will be set when budget is planned
                    actual_amount: actualCost,
                    variance: -actualCost, // Negative because we're spending more than planned (0)
                    threshold: 0,
                    fiscal_year: new Date().getFullYear(),
                    fiscal_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
                }
            });
        }
    }

    // Get the task's WBS to start cascading cost updates
    const task = await tx.task.findUnique({
        where: { task_id: taskId },
        select: { wbs_id: true }
    });

    if (task?.wbs_id) {
        await updateWBSBudgetHierarchy(tx, task.wbs_id);
    }
}

/**
 * Recursively updates WBS budget actual amounts by summing child task costs and child WBS costs
 * Then recursively updates parent WBS until reaching the root
 */
async function updateWBSBudgetHierarchy(tx: any, wbsId: number): Promise<void> {
    // Get all child tasks for this WBS
    const childTasks = await tx.task.findMany({
        where: { wbs_id: wbsId },
        include: {
            budgets: true
        }
    });

    // Get all child WBS elements for this WBS
    const childWBSElements = await tx.wBS.findMany({
        where: { parent_wbs_id: wbsId },
        include: {
            budgets: true
        }
    });

    // Calculate total actual cost from child tasks
    let totalActualCost = 0;
    
    // Sum actual costs from child tasks (only task budgets, not WBS budgets)
    childTasks.forEach((task: any) => {
        const taskActualCost = task.budgets
            .filter((budget: any) => budget.task_id === task.task_id) // Only task-specific budgets
            .reduce((sum: number, budget: any) => sum + budget.actual_amount, 0);
        totalActualCost += taskActualCost;
    });

    // Sum actual costs from child WBS elements (only their own General budgets, not task budgets)
    childWBSElements.forEach((childWBS: any) => {
        const wbsActualCost = childWBS.budgets
            .filter((budget: any) => budget.wbs_id === childWBS.wbs_id  && !budget.task_id) // Only WBS-specific General budgets
            .reduce((sum: number, budget: any) => sum + budget.actual_amount, 0);
        totalActualCost += wbsActualCost;
    });

    // Update current WBS budget actual amount
    const existingWBSBudget = await tx.budget.findFirst({
        where: { 
            wbs_id: wbsId,
        }
    });

    if (existingWBSBudget) {
        await tx.budget.update({
            where: { budget_id: existingWBSBudget.budget_id },
            data: { 
                actual_amount: totalActualCost,
                variance: existingWBSBudget.planned_amount - totalActualCost
            }
        });
    } else {
        // Create WBS budget entry if it doesn't exist
        const wbs = await tx.wBS.findUnique({
            where: { wbs_id: wbsId },
            select: { project_id: true }
        });

        if (wbs) {
            await tx.budget.create({
                data: {
                    project_id: wbs.project_id,
                    wbs_id: wbsId,
                    cost_type: 'General',
                    planned_amount: 0, // Will be set when budget is planned
                    actual_amount: totalActualCost,
                    variance: -totalActualCost, // Negative because we're spending more than planned (0)
                    threshold: 0,
                    fiscal_year: new Date().getFullYear(),
                    fiscal_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
                }
            });
        }
    }

    // Check if this WBS has a parent and update it recursively
    const currentWBS = await tx.wBS.findUnique({
        where: { wbs_id: wbsId },
        select: { parent_wbs_id: true, project_id: true }
    });

    if (currentWBS?.parent_wbs_id) {
        // Recursively update the parent WBS budget
        await updateWBSBudgetHierarchy(tx, currentWBS.parent_wbs_id);
    } else if (currentWBS?.project_id) {
        // This is the root WBS (no parent), update the project's actual cost
        await updateProjectActualCost(tx, currentWBS.project_id);
    }
}

/**
 * Updates the project's actual cost by summing all root WBS actual costs
 */
async function updateProjectActualCost(tx: any, projectId: number): Promise<void> {
    // Get all root WBS (level 0) for this project
    const rootWBSItems = await tx.wBS.findMany({
        where: { 
            project_id: projectId,
            parent_wbs_id: null // Root level
        },
        include: {
            budgets: true
        }
    });

    // Sum actual costs from all root WBS items (only their own General budgets, not child costs)
    const totalProjectActualCost = rootWBSItems.reduce((sum: number, wbs: any) => {
        const wbsActualCost = wbs.budgets
            .filter((budget: any) => budget.wbs_id === wbs.wbs_id && budget.cost_type === 'General' && !budget.task_id) // Only root WBS General budgets
            .reduce((budgetSum: number, budget: any) => budgetSum + budget.actual_amount, 0);
        return sum + wbsActualCost;
    }, 0);

    // Update project's actual cost
    await tx.project.update({
        where: { project_id: projectId },
        data: { actual_cost: totalProjectActualCost }
    });

    // Update project budget entry if it exists
    const existingProjectBudget = await tx.budget.findFirst({
        where: { 
            project_id: projectId,
            wbs_id: null,
            task_id: null
        }
    });

    if (existingProjectBudget) {
        await tx.budget.update({
            where: { budget_id: existingProjectBudget.budget_id },
            data: { 
                actual_amount: totalProjectActualCost,
                variance: existingProjectBudget.planned_amount - totalProjectActualCost
            }
        });
    }
}

/**
 * Recursively updates WBS progress using optional progress_weight when set.
 * Child tasks have no weight (equal share); child WBS may have progress_weight.
 * At root, project progress = weighted average of all root WBS.
 */
async function updateWBSHierarchy(tx: any, wbsId: number): Promise<void> {
    const childTasks = await tx.task.findMany({
        where: { wbs_id: wbsId },
        select: { progress_percentage: true }
    });
    const childWBSElements = await tx.wBS.findMany({
        where: { parent_wbs_id: wbsId },
        select: { progress_percentage: true, progress_weight: true }
    });

    const items: { progress: number; weight?: number | null }[] = [
        ...childTasks.map((t: { progress_percentage: number }) => ({ progress: t.progress_percentage, weight: null })),
        ...childWBSElements.map((c: { progress_percentage: number; progress_weight?: number | null }) => ({
            progress: c.progress_percentage,
            weight: c.progress_weight ?? null
        }))
    ];
    const wbsProgress = items.length > 0 ? weightedProgressAverage(items) : 0;

    await tx.wBS.update({
        where: { wbs_id: wbsId },
        data: { progress_percentage: wbsProgress }
    });

    const currentWBS = await tx.wBS.findUnique({
        where: { wbs_id: wbsId },
        select: { parent_wbs_id: true, project_id: true }
    });

    if (currentWBS?.parent_wbs_id) {
        await updateWBSHierarchy(tx, currentWBS.parent_wbs_id);
    } else if (currentWBS?.project_id) {
        const rootWBSList = await tx.wBS.findMany({
            where: { project_id: currentWBS.project_id, parent_wbs_id: null },
            select: { progress_percentage: true, progress_weight: true }
        });
        const rootItems = rootWBSList.map((w: { progress_percentage: number; progress_weight?: number | null }) => ({
            progress: w.progress_percentage,
            weight: w.progress_weight ?? null
        }));
        const projectProgress = rootItems.length > 0 ? weightedProgressAverage(rootItems) : 0;
        await tx.project.update({
            where: { project_id: currentWBS.project_id },
            data: { progress_percentage: projectProgress }
        });
    }
}
