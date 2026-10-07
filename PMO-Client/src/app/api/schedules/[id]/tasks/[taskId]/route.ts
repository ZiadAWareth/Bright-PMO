import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// PUT /api/schedules/[id]/tasks/[taskId] - Update a schedule task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }
    if (!taskId || isNaN(parseInt(taskId))) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }
    const body = await request.json();
    const { start_date, end_date, budget, ...rest } = body;
    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    // Verify task exists and belongs to this schedule
    const existingTask = await prisma.scheduleTask.findFirst({
      where: {
        task_id: parseInt(taskId),
        schedule_id: scheduleId,
      },
    });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    // Prepare update data
    const updateData: any = { ...rest };
    if (start_date !== undefined) {
      updateData.start_date = new Date(start_date);
    }
    if (end_date !== undefined) {
      updateData.end_date = new Date(end_date);
    }
    // Validate dates if both are provided
    const newStart = updateData.start_date ? updateData.start_date : existingTask.start_date;
    const newEnd = updateData.end_date ? updateData.end_date : existingTask.end_date;
    if (newStart && newEnd && newStart > newEnd) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }
    // If assigned to a WBS, ensure dates are within parent WBS range
    if (existingTask.wbs_id) {
      const parentWBS = await prisma.scheduleWBS.findFirst({
        where: {
          wbs_id: existingTask.wbs_id,
          schedule_id: scheduleId,
        },
      });
      if (parentWBS && parentWBS.start_date && parentWBS.end_date) {
        if (newStart < parentWBS.start_date || newEnd > parentWBS.end_date) {
          return NextResponse.json(
            { error: `Task dates must be within parent WBS date range (${parentWBS.start_date.toLocaleDateString()} - ${parentWBS.end_date ? parentWBS.end_date.toLocaleDateString() : 'N/A'})` },
            { status: 400 }
          );
        }
      }
    }
    // --- Budget validation logic ---
    if (budget !== undefined && existingTask.wbs_id) {
      // Find parent WBS
      const parentWBS = await prisma.scheduleWBS.findFirst({
        where: {
          wbs_id: existingTask.wbs_id,
          schedule_id: scheduleId,
        },
      });
      if (parentWBS) {
        // Sum all sibling tasks' budgets (excluding this task)
        const siblingBudgets = await prisma.scheduleBudget.findMany({
          where: {
            wbs_id: existingTask.wbs_id,
            schedule_id: scheduleId,
            NOT: { task_id: parseInt(taskId) },
          },
          select: { planned_amount: true },
        });
        const siblingTasksTotal = siblingBudgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
        // Add the new value for this task
        const newTotalTaskBudget = siblingTasksTotal + parseFloat(budget);
        // Sum all direct child WBS budgets
        const childWBS = await prisma.scheduleWBS.findMany({
          where: {
            parent_wbs_id: parentWBS.wbs_id,
            schedule_id: scheduleId,
          },
          include: { budget: true },
        });
        const childWBSBudget = childWBS.reduce((sum, w) => sum + (w.budget?.planned_amount || 0), 0);
        // Use parentWBS budget relation
        const parentBudget = await prisma.scheduleBudget.findUnique({ where: { wbs_id: parentWBS.wbs_id } });
        const totalChildrenBudget = newTotalTaskBudget + childWBSBudget;
        if (parentBudget && totalChildrenBudget > parentBudget.planned_amount) {
          return NextResponse.json(
            { error: `Total of sibling tasks and child WBS budgets (${totalChildrenBudget}) exceeds parent WBS budget (${parentBudget.planned_amount})` },
            { status: 400 }
          );
        }
      }
    }
    // Update the task
    const updatedTask = await prisma.scheduleTask.update({
      where: { task_id: parseInt(taskId) },
      data: updateData,
    });
    // Update the associated ScheduleBudget if budget is provided
    if (budget !== undefined) {
      const taskBudget = await prisma.scheduleBudget.findUnique({
        where: { task_id: parseInt(taskId) },
      });
      if (taskBudget) {
        await prisma.scheduleBudget.update({
          where: { budget_id: taskBudget.budget_id },
          data: { planned_amount: parseFloat(budget) },
        });
      }
    }
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id]/tasks/[taskId] - Delete a schedule task with cascade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    const taskIdInt = parseInt(taskId);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }
    if (isNaN(taskIdInt)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Verify task exists and belongs to this schedule
    const task = await prisma.scheduleTask.findFirst({
      where: {
        task_id: taskIdInt,
        schedule_id: scheduleId,
      },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Perform cascading deletes in the correct order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete schedule task assignments (team members)
      await tx.scheduleTaskAssignment.deleteMany({
        where: { task_id: taskIdInt }
      });

      // 2. Delete schedule assignments (resources)
      await tx.scheduleAssignment.deleteMany({
        where: { task_id: taskIdInt }
      });

      // 3. Delete schedule task dependencies (both predecessor and successor)
      await tx.scheduleTaskDependency.deleteMany({
        where: {
          OR: [
            { predecessor_task_id: taskIdInt },
            { successor_task_id: taskIdInt }
          ]
        }
      });

      // 4. Delete schedule budgets associated with this task
      await tx.scheduleBudget.deleteMany({
        where: { task_id: taskIdInt }
      });

      // 5. Delete schedule risks associated with this task
      await tx.scheduleRisk.deleteMany({
        where: { task_id: taskIdInt }
      });

      // 6. Finally, delete the schedule task itself
      await tx.scheduleTask.delete({
        where: { task_id: taskIdInt }
      });
    });

    // After successful deletion, recalculate WBS progress if task was assigned to a WBS
    if (task.wbs_id) {
      try {
        // Calculate remaining tasks for this WBS
        const remainingTasks = await prisma.scheduleTask.findMany({
          where: { wbs_id: task.wbs_id }
        });

        const completedTasks = remainingTasks.filter(t => t.status === 'completed');
        const progressPercentage = remainingTasks.length > 0 
          ? Math.round((completedTasks.length / remainingTasks.length) * 100)
          : 0;

        // Update WBS progress
        await prisma.scheduleWBS.update({
          where: { wbs_id: task.wbs_id },
          data: { progress_percentage: progressPercentage }
        });

        // Also recalculate parent WBS progress if applicable
        const wbs = await prisma.scheduleWBS.findUnique({
          where: { wbs_id: task.wbs_id },
          select: { parent_wbs_id: true }
        });

        if (wbs?.parent_wbs_id) {
          await recalculateParentWBSProgress(wbs.parent_wbs_id);
        }
      } catch (progressError) {
        console.error('Error updating WBS progress after task deletion:', progressError);
        // Don't fail the entire operation if progress update fails
      }
    }

    return NextResponse.json(
      { message: "Schedule task and all related data deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error('Schedule task deletion error:', error);
    return NextResponse.json(
      { error: "Failed to delete schedule task: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to recalculate parent WBS progress
async function recalculateParentWBSProgress(parentWbsId: number): Promise<void> {
  try {
    // Get all child WBS items
    const childWBS = await prisma.scheduleWBS.findMany({
      where: { parent_wbs_id: parentWbsId }
    });

    if (childWBS.length === 0) return;

    // Calculate completed count
    const completedChildren = childWBS.filter(wbs => wbs.progress_percentage === 100);
    const progressPercentage = Math.round((completedChildren.length / childWBS.length) * 100);

    // Update parent WBS progress
    await prisma.scheduleWBS.update({
      where: { wbs_id: parentWbsId },
      data: { progress_percentage: progressPercentage }
    });

    // Check if this parent has a parent (recursive)
    const parentWBS = await prisma.scheduleWBS.findUnique({
      where: { wbs_id: parentWbsId },
      select: { parent_wbs_id: true }
    });

    if (parentWBS?.parent_wbs_id) {
      await recalculateParentWBSProgress(parentWBS.parent_wbs_id);
    }
  } catch (error) {
    console.error('Error recalculating parent WBS progress:', error);
  }
} 