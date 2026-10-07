import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// PUT /api/schedules/[id]/wbs/[wbsId] - Update a WBS item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wbsId: string }> }
) {
  const { id, wbsId } = await params;

  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    if (!wbsId || isNaN(parseInt(wbsId))) {
      return NextResponse.json({ error: 'Invalid WBS ID' }, { status: 400 });
    }

    const body = await request.json();
    const { budget_amount, start_date, end_date } = body;

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        // user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Verify WBS item exists and belongs to this schedule
    const existingWBS = await prisma.scheduleWBS.findFirst({
      where: {
        wbs_id: parseInt(wbsId),
        schedule_id: scheduleId,
      },
    });

    if (!existingWBS) {
      return NextResponse.json({ error: 'WBS item not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    // Remove all budget_amount logic on WBS. Instead, if budget_amount is provided, update the ScheduleBudget for this WBS.
    if (budget_amount !== undefined) {
      if (budget_amount < 0) {
        return NextResponse.json(
          { error: 'Budget amount cannot be negative' },
          { status: 400 }
        );
      }
      // --- Budget validation logic ---
      // 1. If this WBS has a parent, check that the sum of all siblings' and this WBS's budgets and all direct child tasks' budgets does not exceed the parent WBS's budget
      if (existingWBS.parent_wbs_id) {
        // Get parent budget
        const parentBudget = await prisma.scheduleBudget.findUnique({
          where: { wbs_id: existingWBS.parent_wbs_id },
        });
        if (!parentBudget) {
          return NextResponse.json(
            { error: 'Parent WBS budget not found' },
            { status: 400 }
          );
        }
        // Get all siblings (other children of the same parent)
        const siblings = await prisma.scheduleWBS.findMany({
          where: {
            parent_wbs_id: existingWBS.parent_wbs_id,
            schedule_id: scheduleId,
            NOT: { wbs_id: existingWBS.wbs_id },
          },
        });
        // Get budgets for siblings
        const siblingBudgets = await prisma.scheduleBudget.findMany({
          where: {
            wbs_id: { in: siblings.map(s => s.wbs_id) },
            schedule_id: scheduleId,
          },
        });
        const siblingTotal = siblingBudgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
        // Get all direct child tasks of the parent
        const siblingTasks = await prisma.scheduleTask.findMany({
          where: {
            wbs_id: existingWBS.parent_wbs_id,
            schedule_id: scheduleId,
          },
        });
        const siblingTaskBudgets = await prisma.scheduleBudget.findMany({
          where: {
            task_id: { in: siblingTasks.map(t => t.task_id) },
            schedule_id: scheduleId,
          },
        });
        const siblingTaskTotal = siblingTaskBudgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
        // New total for this WBS
        const newTotal = siblingTotal + siblingTaskTotal + budget_amount;
        if (newTotal > parentBudget.planned_amount) {
          return NextResponse.json(
            { error: `Total of siblings, this WBS, and direct child tasks (${newTotal}) exceeds parent WBS budget (${parentBudget.planned_amount})` },
            { status: 400 }
          );
        }
      }
      // 2. If this WBS is a parent (has children), check that the sum of all direct children WBS and tasks' budgets does not exceed the new budget value
      const children = await prisma.scheduleWBS.findMany({
        where: {
          parent_wbs_id: existingWBS.wbs_id,
          schedule_id: scheduleId,
        },
      });
      const childBudgets = await prisma.scheduleBudget.findMany({
        where: {
          wbs_id: { in: children.map(c => c.wbs_id) },
          schedule_id: scheduleId,
        },
      });
      const childTotal = childBudgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
      // Get all direct child tasks of this WBS
      const childTasks = await prisma.scheduleTask.findMany({
        where: {
          wbs_id: existingWBS.wbs_id,
          schedule_id: scheduleId,
        },
      });
      const childTaskBudgets = await prisma.scheduleBudget.findMany({
        where: {
          task_id: { in: childTasks.map(t => t.task_id) },
          schedule_id: scheduleId,
        },
      });
      const childTaskTotal = childTaskBudgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
      const totalChildren = childTotal + childTaskTotal;
      // Only compare children total to the new parent value (do not include parent value itself)
      if (totalChildren > budget_amount) {
        return NextResponse.json(
          { error: `Total of direct children WBS and tasks (${totalChildren}) exceeds new parent budget value (${budget_amount})` },
          { status: 400 }
        );
      }
      // --- End budget validation logic ---
      // Update the ScheduleBudget for this WBS
      const wbsBudget = await prisma.scheduleBudget.findUnique({
        where: { wbs_id: parseInt(wbsId) },
      });
      if (!wbsBudget) {
        return NextResponse.json(
          { error: 'No budget found for this WBS' },
          { status: 404 }
        );
      }
      await prisma.scheduleBudget.update({
        where: { budget_id: wbsBudget.budget_id },
        data: { planned_amount: budget_amount },
      });
    }

    if (start_date !== undefined) {
      updateData.start_date = new Date(start_date);
    }

    if (end_date !== undefined) {
      updateData.end_date = new Date(end_date);
    }

    // Validate dates if both are provided
    if (updateData.start_date && updateData.end_date) {
      if (updateData.start_date >= updateData.end_date) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Parent WBS date range validation
    if (existingWBS.parent_wbs_id && (updateData.start_date || updateData.end_date)) {
      const parentWBS = await prisma.scheduleWBS.findFirst({
        where: {
          wbs_id: existingWBS.parent_wbs_id,
          schedule_id: scheduleId,
        },
      });
      if (parentWBS && parentWBS.start_date && parentWBS.end_date) {
        const newStart = updateData.start_date ? updateData.start_date : existingWBS.start_date;
        const newEnd = updateData.end_date ? updateData.end_date : existingWBS.end_date;
        if (newStart < parentWBS.start_date || newEnd > parentWBS.end_date) {
          return NextResponse.json(
            { error: `WBS dates must be within parent WBS date range (${new Date(parentWBS.start_date).toLocaleDateString()} - ${new Date(parentWBS.end_date).toLocaleDateString()})` },
            { status: 400 }
          );
        }
      }
    }

    // Remove all budget validation/aggregation that uses WBS.budget_amount. Use planned_amount from ScheduleBudget instead.

    const updatedWBS = await prisma.scheduleWBS.update({
      where: {
        wbs_id: parseInt(wbsId),
      },
      data: updateData,
      include: {
        parent: true,
        children: true,
        tasks: true,
        budget: true,
        procurements: true,
      },
    });

    // If this is a root WBS (no parent), also update the project schedule
    if (!existingWBS.parent_wbs_id) {
      const scheduleUpdateData: any = {};
      
      if (budget_amount !== undefined) {
        scheduleUpdateData.budget_amount = budget_amount;
      }
      
      if (start_date !== undefined) {
        scheduleUpdateData.start_date = new Date(start_date);
      }
      
      if (end_date !== undefined) {
        scheduleUpdateData.planned_end_date = new Date(end_date);
      }

      // Update the project schedule if there are changes
      if (Object.keys(scheduleUpdateData).length > 0) {
        await prisma.projectSchedule.update({
          where: {
            schedule_id: scheduleId,
          },
          data: scheduleUpdateData,
        });
      }
    }

    return NextResponse.json(updatedWBS);
  } catch (error) {
    console.error('Error updating WBS item:', error);
    return NextResponse.json(
      { error: 'Failed to update WBS item' },
      { status: 500 }
    );
  }
} 

// DELETE /api/schedules/[id]/wbs/[wbsId] - Delete a schedule WBS item with cascade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wbsId: string }> }
) {
  const { id, wbsId } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    const wbsIdInt = parseInt(wbsId);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }
    if (isNaN(wbsIdInt)) {
      return NextResponse.json({ error: 'Invalid WBS ID' }, { status: 400 });
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

    // Verify WBS item exists and belongs to this schedule
    const wbs = await prisma.scheduleWBS.findFirst({
      where: {
        wbs_id: wbsIdInt,
        schedule_id: scheduleId,
      },
    });
    if (!wbs) {
      return NextResponse.json({ error: 'WBS item not found' }, { status: 404 });
    }

    // Get all child WBS items and tasks that need to be deleted
    const allChildWBS = await getAllChildWBS(wbsIdInt, scheduleId);
    const allChildTasks = await getAllChildTasks(wbsIdInt, scheduleId);

    // Perform cascading deletes in the correct order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete all child tasks first (with their dependencies)
      for (const task of allChildTasks) {
        // Delete task assignments
        await tx.scheduleTaskAssignment.deleteMany({
          where: { task_id: task.task_id }
        });

        // Delete schedule assignments
        await tx.scheduleAssignment.deleteMany({
          where: { task_id: task.task_id }
        });

        // Delete task dependencies
        await tx.scheduleTaskDependency.deleteMany({
          where: {
            OR: [
              { predecessor_task_id: task.task_id },
              { successor_task_id: task.task_id }
            ]
          }
        });

        // Delete task budgets
        await tx.scheduleBudget.deleteMany({
          where: { task_id: task.task_id }
        });

        // Delete task risks
        await tx.scheduleRisk.deleteMany({
          where: { task_id: task.task_id }
        });

        // Delete the task itself
        await tx.scheduleTask.delete({
          where: { task_id: task.task_id }
        });
      }

             // 2. Delete all child WBS items (recursively)
       for (const childWBS of allChildWBS) {
         // Delete WBS budgets
         await tx.scheduleBudget.deleteMany({
           where: { wbs_id: childWBS.wbs_id }
         });

         // Delete WBS procurements
         await tx.scheduleProcurement.deleteMany({
           where: { wbs_id: childWBS.wbs_id }
         });

         // Delete the WBS item itself
         await tx.scheduleWBS.delete({
           where: { wbs_id: childWBS.wbs_id }
         });
       }

       // 3. Delete WBS budgets
       await tx.scheduleBudget.deleteMany({
         where: { wbs_id: wbsIdInt }
       });

       // 4. Delete WBS procurements
       await tx.scheduleProcurement.deleteMany({
         where: { wbs_id: wbsIdInt }
       });

      // 6. Finally, delete the WBS item itself
      await tx.scheduleWBS.delete({
        where: { wbs_id: wbsIdInt }
      });
    });

    // After successful deletion, recalculate parent WBS progress if applicable
    if (wbs.parent_wbs_id) {
      try {
        await recalculateParentWBSProgress(wbs.parent_wbs_id);
      } catch (progressError) {
        console.error('Error updating parent WBS progress after deletion:', progressError);
        // Don't fail the entire operation if progress update fails
      }
    }

    return NextResponse.json(
      { message: "Schedule WBS item and all related data deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error('Schedule WBS deletion error:', error);
    return NextResponse.json(
      { error: "Failed to delete schedule WBS item: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to get all child WBS items recursively
async function getAllChildWBS(parentWbsId: number, scheduleId: number): Promise<any[]> {
  const children = await prisma.scheduleWBS.findMany({
    where: {
      parent_wbs_id: parentWbsId,
      schedule_id: scheduleId,
    },
  });

  let allChildren = [...children];
  
  for (const child of children) {
    const grandChildren = await getAllChildWBS(child.wbs_id, scheduleId);
    allChildren = allChildren.concat(grandChildren);
  }

  return allChildren;
}

// Helper function to get all child tasks recursively
async function getAllChildTasks(wbsId: number, scheduleId: number): Promise<any[]> {
  // Get direct tasks
  const directTasks = await prisma.scheduleTask.findMany({
    where: {
      wbs_id: wbsId,
      schedule_id: scheduleId,
    },
  });

  // Get child WBS items
  const childWBS = await prisma.scheduleWBS.findMany({
    where: {
      parent_wbs_id: wbsId,
      schedule_id: scheduleId,
    },
  });

  let allTasks = [...directTasks];

  // Recursively get tasks from child WBS
  for (const child of childWBS) {
    const childTasks = await getAllChildTasks(child.wbs_id, scheduleId);
    allTasks = allTasks.concat(childTasks);
  }

  return allTasks;
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