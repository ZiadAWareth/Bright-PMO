import { getUserFromHeaders } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



/**
 * @swagger
 * /api/fieldData/{id}:
 *   get:
 *     summary: Get a specific field data entry
 *     description: Retrieve a specific field data entry by ID
 *     tags: [Field Data]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Field data entry ID
 *     responses:
 *       200:
 *         description: Field data entry retrieved successfully
 *       404:
 *         description: Field data entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const fieldDataId = parseInt(resolvedParams.id);

        const fieldDataEntry = await prisma.fieldData.findUnique({
            where: { id: fieldDataId },
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
                        progress_percentage: true,
                        estimated_hours: true,
                        actual_hours: true
                    }
                }
            }
        });

        if (!fieldDataEntry) {
            return NextResponse.json(
                { error: 'Field data entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(fieldDataEntry, { status: 200 });
    } catch (error) {
        console.error('Error fetching field data entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch field data entry' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/fieldData/{id}:
 *   put:
 *     summary: Update a field data entry
 *     description: Update a specific field data entry
 *     tags: [Field Data]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Field data entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *       200:
 *         description: Field data entry updated successfully
 *       404:
 *         description: Field data entry not found
 *       403:
 *         description: Forbidden - can only update own entries
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const fieldDataId = parseInt(resolvedParams.id);
        const data = await req.json();

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

        // Check if field data entry exists and user is the reporter
        const existingEntry = await prisma.fieldData.findUnique({
            where: { id: fieldDataId },
            include: {
                resource_assignment: true
            }
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Field data entry not found' },
                { status: 404 }
            );
        }

        if (existingEntry.reported_by !== userAccount.account_id) {
            return NextResponse.json(
                { error: 'You can only update your own field data entries' },
                { status: 403 }
            );
        }

        // Check if task dependencies are met
        const taskWithDeps = await prisma.task.findUnique({
            where: { task_id: existingEntry.task_id },
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

        if (taskWithDeps && taskWithDeps.successor_dependencies && taskWithDeps.successor_dependencies.length > 0) {
            const incompleteDependencies = taskWithDeps.successor_dependencies.filter(dep => {
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
                        error: 'Task dependencies not met. Cannot update field data.',
                        dependencyIssues: reasons
                    },
                    { status: 400 }
                );
            }
        }

        // Validate progress percentage if provided
        if (data.actual_progress !== undefined && (data.actual_progress < 0 || data.actual_progress > 100)) {
            return NextResponse.json(
                { error: 'Actual progress must be between 0 and 100' },
                { status: 400 }
            );
        }

        // Validate actual hours if provided
        if (data.actual_hours !== undefined && data.actual_hours < 0) {
            return NextResponse.json(
                { error: 'Actual hours must be non-negative' },
                { status: 400 }
            );
        }

        // If resource assignment is being changed, validate it
        if (data.resource_assignment_id && data.resource_assignment_id !== existingEntry.resource_assignment_id) {
            const resourceAssignment = await prisma.resourceAssignment.findUnique({
                where: { assignment_id: data.resource_assignment_id }
            });

            if (!resourceAssignment) {
                return NextResponse.json(
                    { error: 'Resource assignment not found' },
                    { status: 404 }
                );
            }

            if (resourceAssignment.task_id !== existingEntry.task_id) {
                return NextResponse.json(
                    { error: 'Resource assignment does not belong to the same task' },
                    { status: 400 }
                );
            }
        }

        // Calculate the difference in actual_hours for resource assignment update
        const oldActualHours = existingEntry.actual_hours;
        const newActualHours = data.actual_hours !== undefined ? data.actual_hours : oldActualHours;
        const hoursDifference = newActualHours - oldActualHours;

        // Use transaction to update field data and resource assignment
        const [updatedEntry] = await prisma.$transaction(async (tx) => {
            // Update field data entry
            const updateData: any = {};
            if (data.resource_assignment_id !== undefined) updateData.resource_assignment_id = data.resource_assignment_id;
            if (data.actual_progress !== undefined) updateData.actual_progress = data.actual_progress;
            if (data.actual_hours !== undefined) updateData.actual_hours = data.actual_hours;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.is_according_to_plan !== undefined) updateData.is_according_to_plan = data.is_according_to_plan;

            const entry = await tx.fieldData.update({
                where: { id: fieldDataId },
                data: updateData,
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

            // Update resource assignment actual hours and progress if changed
            // NOTE: Field data represents incremental progress that gets added/subtracted from totals
            const targetAssignmentId = data.resource_assignment_id || existingEntry.resource_assignment_id;
            
            if (data.actual_hours !== undefined || data.actual_progress !== undefined) {
                // Get current resource assignment values
                const currentAssignment = await tx.resourceAssignment.findUnique({
                    where: { assignment_id: targetAssignmentId },
                    select: { actual_hours: true, progress: true }
                });

                if (!currentAssignment) {
                    throw new Error('Resource assignment not found');
                }

                // Calculate the difference between old and new values
                const hoursDifference = (data.actual_hours !== undefined ? data.actual_hours : existingEntry.actual_hours) - existingEntry.actual_hours;
                const progressDifference = (data.actual_progress !== undefined ? data.actual_progress : existingEntry.actual_progress) - existingEntry.actual_progress;

                // Apply the differences to current totals
                const newTotalHours = Math.max(0, currentAssignment.actual_hours + hoursDifference); // Don't go below 0
                const potentialProgress = currentAssignment.progress + progressDifference;
                
                // Validate that progress doesn't exceed 100%
                if (potentialProgress > 100) {
                    throw new Error(`This update would result in ${potentialProgress}% total progress, which exceeds 100%. Current progress is ${currentAssignment.progress}%.`);
                }
                
                const newTotalProgress = Math.max(0, Math.round(potentialProgress)); // Don't go below 0
                
                // Prepare update data
                const updateData: any = {
                    actual_hours: newTotalHours,
                    progress: newTotalProgress
                };
                
                // Note: Assignment completion tracking will be handled at the UI level
                // since ResourceAssignment model doesn't have completion status fields
                
                await tx.resourceAssignment.update({
                    where: { assignment_id: targetAssignmentId },
                    data: updateData
                });

                // Update task progress and actual hours based on all resource assignments
                const resourceAssignments = await tx.resourceAssignment.findMany({
                    where: { task_id: existingEntry.task_id },
                    select: {
                        progress: true,
                        planned_hours: true,
                        actual_hours: true
                    }
                });

                let taskProgress = 0;
                let totalActualHours = 0;
                
                if (resourceAssignments.length > 0) {
                    // Calculate weighted progress based on planned hours
                    const totalPlannedHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.planned_hours, 0);
                    
                    if (totalPlannedHours > 0) {
                        const weightedProgress = resourceAssignments.reduce((sum, assignment) => {
                            const weight = assignment.planned_hours / totalPlannedHours;
                            return sum + (assignment.progress * weight);
                        }, 0);
                        taskProgress = Math.round(weightedProgress);
                    }
                    
                    // Calculate total actual hours from all resource assignments
                    totalActualHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.actual_hours, 0);
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
                    where: { task_id: existingEntry.task_id },
                    data: taskUpdateData
                });
            }

            return [entry];
        });

        return NextResponse.json(updatedEntry, { status: 200 });
    } catch (error) {
        console.error('Error updating field data entry:', error);
        return NextResponse.json(
            { error: 'Failed to update field data entry' },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/fieldData/{id}:
 *   delete:
 *     summary: Delete a field data entry
 *     description: Delete a specific field data entry
 *     tags: [Field Data]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Field data entry ID
 *     responses:
 *       200:
 *         description: Field data entry deleted successfully
 *       404:
 *         description: Field data entry not found
 *       403:
 *         description: Forbidden - can only delete own entries
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const fieldDataId = parseInt(resolvedParams.id);

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

        // Check if field data entry exists and user is the reporter
        const existingEntry = await prisma.fieldData.findUnique({
            where: { id: fieldDataId },
            include: {
                resource_assignment: true
            }
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Field data entry not found' },
                { status: 404 }
            );
        }

        if (existingEntry.reported_by !== userAccount.account_id) {
            return NextResponse.json(
                { error: 'You can only delete your own field data entries' },
                { status: 403 }
            );
        }

        // Use transaction to delete field data and update resource assignment
        await prisma.$transaction(async (tx) => {
            // Get current resource assignment values before deletion
            const currentAssignment = await tx.resourceAssignment.findUnique({
                where: { assignment_id: existingEntry.resource_assignment_id },
                select: { actual_hours: true, progress: true }
            });

            if (!currentAssignment) {
                throw new Error('Resource assignment not found');
            }

            // Delete field data entry
            await tx.fieldData.delete({
                where: { id: fieldDataId }
            });

            // Subtract the deleted field data values from current totals
            const newTotalHours = Math.max(0, currentAssignment.actual_hours - existingEntry.actual_hours); // Don't go below 0
            const newTotalProgress = Math.min(100, Math.max(0, Math.round(currentAssignment.progress - existingEntry.actual_progress))); // Cap between 0-100%

            await tx.resourceAssignment.update({
                where: { assignment_id: existingEntry.resource_assignment_id },
                data: {
                    actual_hours: newTotalHours,
                    progress: newTotalProgress
                }
            });

            // Update task progress and actual hours based on all resource assignments
            const resourceAssignments = await tx.resourceAssignment.findMany({
                where: { task_id: existingEntry.task_id },
                select: {
                    progress: true,
                    planned_hours: true,
                    actual_hours: true
                }
            });

            let taskProgress = 0;
            let totalActualHours = 0;
            
            if (resourceAssignments.length > 0) {
                // Calculate weighted progress based on planned hours
                const totalPlannedHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.planned_hours, 0);
                
                if (totalPlannedHours > 0) {
                    const weightedProgress = resourceAssignments.reduce((sum, assignment) => {
                        const weight = assignment.planned_hours / totalPlannedHours;
                        return sum + (assignment.progress * weight);
                    }, 0);
                    taskProgress = Math.round(weightedProgress);
                }
                
                // Calculate total actual hours from all resource assignments
                totalActualHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.actual_hours, 0);
            }

            // Prepare task update data
            const taskUpdateData: any = { 
                progress_percentage: taskProgress,
                actual_hours: totalActualHours
            };
            
            // Auto-complete task when it reaches 100% (should be rare for deletions, but possible)
            if (taskProgress >= 100) {
                taskUpdateData.status = 'completed';
                taskUpdateData.actual_end_date = new Date();
            }

            await tx.task.update({
                where: { task_id: existingEntry.task_id },
                data: taskUpdateData
            });
        });

        return NextResponse.json(
            { message: 'Field data entry deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting field data entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete field data entry' },
            { status: 500 }
        );
    }
} 