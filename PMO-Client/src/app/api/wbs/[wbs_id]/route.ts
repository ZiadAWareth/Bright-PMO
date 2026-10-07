import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { weightedProgressAverage } from '@/lib/wbs-progress-utils';




// Helper function to update parent WBS progress recursively
async function updateParentProgress(wbsId: number): Promise<void> {
  try {
    console.log(`🔼 updateParentProgress called for WBS ${wbsId}`);
    
    const currentWBS = await prisma.wBS.findUnique({
      where: { wbs_id: wbsId },
      select: { parent_wbs_id: true, project_id: true, name: true }
    });

    console.log(`📍 Current WBS: ${currentWBS?.name}, Parent: ${currentWBS?.parent_wbs_id}, Project: ${currentWBS?.project_id}`);

    if (!currentWBS?.parent_wbs_id) {
      console.log(`🎯 WBS ${wbsId} is root, stopping parent chain`);
      return;
    }

    const siblings = await prisma.wBS.findMany({
      where: { parent_wbs_id: currentWBS.parent_wbs_id },
      select: { wbs_id: true, name: true, progress_percentage: true, progress_weight: true }
    });

    console.log(`👥 Found ${siblings.length} siblings under parent ${currentWBS.parent_wbs_id}`);
    siblings.forEach(s => {
      console.log(`  - WBS ${s.wbs_id} (${s.name}): ${s.progress_percentage}%`);
    });

    const items = siblings.map((w) => ({
      progress: w.progress_percentage || 0,
      weight: w.progress_weight ?? null
    }));
    const averageProgress = items.length > 0 ? weightedProgressAverage(items) : 0;

    console.log(`📊 Calculated parent progress: ${averageProgress}% (siblings: ${siblings.length})`);

    // Update parent
    await prisma.wBS.update({
      where: { wbs_id: currentWBS.parent_wbs_id },
      data: { progress_percentage: averageProgress }
    });

    console.log(`✅ Updated parent WBS ${currentWBS.parent_wbs_id} to ${averageProgress}%`);

    // Recursively update grandparent
    await updateParentProgress(currentWBS.parent_wbs_id);
  } catch (error) {
    console.error(`❌ Error in updateParentProgress for WBS ${wbsId}:`, error);
  }
}

// Helper function to update project progress from all root WBS (weighted when progress_weight set)
async function updateProjectProgress(projectId: number): Promise<void> {
  try {
    console.log(`🔄 updateProjectProgress called for project ${projectId}`);

    const rootWBSList = await prisma.wBS.findMany({
      where: { project_id: projectId, parent_wbs_id: null },
      select: { wbs_id: true, name: true, progress_percentage: true, progress_weight: true }
    });

    if (rootWBSList.length === 0) {
      console.warn(`⚠️ No root WBS found for project ${projectId}`);
      return;
    }

    const rootItems = rootWBSList.map((w) => ({
      progress: w.progress_percentage || 0,
      weight: w.progress_weight ?? null
    }));
    const projectProgress = weightedProgressAverage(rootItems);
    console.log(`🌳 Root WBS count: ${rootWBSList.length}, weighted project progress: ${projectProgress}%`);

    const beforeProject = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { progress_percentage: true, status: true, name: true }
    });
    console.log(`📊 BEFORE: Project "${beforeProject?.name}" at ${beforeProject?.progress_percentage}% (status: ${beforeProject?.status})`);

    const updateData: any = { progress_percentage: projectProgress };
    if (projectProgress === 100) {
      updateData.status = 'completed';
      console.log(`🎉 Progress reached 100%, automatically setting project status to "completed"`);
    } else if (projectProgress < 100 && beforeProject?.status === 'completed') {
      updateData.status = 'execution';
      console.log(`⚠️ Progress dropped below 100%, reverting status from "completed" to "execution"`);
    }

    const updatedProject = await prisma.project.update({
      where: { project_id: projectId },
      data: updateData
    });

    console.log(`✅ AFTER: Project ${projectId} updated to ${updatedProject.progress_percentage}% (status: ${updatedProject.status})`);

    // Verify
    const afterProject = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { progress_percentage: true, status: true }
    });
    console.log(`🔍 VERIFICATION: Database shows ${afterProject?.progress_percentage}% (status: ${afterProject?.status})`);

    if (afterProject?.progress_percentage !== updatedProject.progress_percentage) {
      console.error(`❌ MISMATCH! Expected ${updatedProject.progress_percentage}%, got ${afterProject?.progress_percentage}%`);
    }
  } catch (error) {
    console.error(`❌ Error in updateProjectProgress for project ${projectId}:`, error);
  }
}

// Helper function to recalculate progress for all WBS items that have children based on completion count
async function recalculateAllParentProgress(projectId: number): Promise<void> {
  try {
    // Get all WBS items for the project
    const allWBS = await prisma.wBS.findMany({
      where: { project_id: projectId },
      select: { wbs_id: true, parent_wbs_id: true, progress_percentage: true },
      orderBy: { level: 'desc' } // Start from deepest level and work up
    });

    // Group by parent to find all items that have children
    const parentsWithChildren = new Set<number>();
    allWBS.forEach((wbs: { wbs_id: number; parent_wbs_id: number | null; progress_percentage: number }) => {
      if (wbs.parent_wbs_id) {
        parentsWithChildren.add(wbs.parent_wbs_id);
      }
    });

    // Calculate progress for each parent that has children
    for (const parentId of parentsWithChildren) {
      const children = allWBS.filter((wbs: { wbs_id: number; parent_wbs_id: number | null; progress_percentage: number }) => wbs.parent_wbs_id === parentId);
      
      if (children.length > 0) {
        // Calculate progress based on completed children count (progress_percentage = 100)
        const completedChildren = children.filter((child: { progress_percentage: number }) => child.progress_percentage === 100).length;
        const progressPercentage = Math.round((completedChildren / children.length) * 100);

        // Update parent progress
        await prisma.wBS.update({
          where: { wbs_id: parentId },
          data: { progress_percentage: progressPercentage }
        });
      }
    }
  } catch (error) {
    console.error('Error recalculating parent progress:', error);
  }
}

/**
 * @swagger
 * /api/wbs/{wbs_id}:
 *   get:
 *     summary: Get a WBS entry by ID
 *     description: Retrieves a specific WBS entry by its ID with all related data including project, parent, children, items, tasks, budgets, documents, and procurements
 *     tags:
 *       - WBS
 *     parameters:
 *       - in: path
 *         name: wbs_id
 *         required: true
 *         description: ID of the WBS entry to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: WBS entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wbs_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 parent_wbs_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 wbs_code:
 *                   type: string
 *                 level:
 *                   type: integer
 *                 progress_percentage:
 *                   type: number
 *                   format: float
 *                 project:
 *                   type: object
 *                   description: Associated project details
 *                 parent:
 *                   type: object
 *                   description: Parent WBS details
 *                 children:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Child WBS entries
 *                 wbsItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Associated WBS items
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Associated tasks
 *                 budgets:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Associated budgets
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Associated documents
 *                 procurements:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Associated procurements
 *       404:
 *         description: WBS not found
 *       500:
 *         description: Server error
 */
// GET single WBS by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const wbs = await prisma.wBS.findUnique({
      where: { wbs_id: parseInt(wbs_id) },
      include: {
        project: true,
        parent: true,
        children: true,
        wbsItems: true,
        tasks: true,
        budgets: {
          where: { cost_type: 'planned' }
        },
        documents: true,
        procurements: true,
      },
    });

    if (!wbs) {
      return NextResponse.json(
        { error: "WBS not found" },
        { status: 404 }
      );
    }

    // Add budget_amount to the response for frontend compatibility
    const wbsWithBudget = {
      ...wbs,
      budget_amount: wbs.budgets.length > 0 ? wbs.budgets[0].planned_amount : 0,
      actual_cost: wbs.budgets.length > 0 ? wbs.budgets[0].actual_amount : 0,
    };

    return NextResponse.json(wbsWithBudget);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch WBS: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// ✅ NEW: Helper function to cascade completion to all tasks under WBS tree
async function cascadeCompletionToTasks(wbsId: number): Promise<void> {
  // Get all WBS IDs in this subtree
  const getAllDescendantWBS = async (id: number): Promise<number[]> => {
    const children = await prisma.wBS.findMany({
      where: { parent_wbs_id: id },
      select: { wbs_id: true }
    });
    
    let allIds = [id];
    for (const child of children) {
      const descendants = await getAllDescendantWBS(child.wbs_id);
      allIds = [...allIds, ...descendants];
    }
    return allIds;
  };

  const allWBSIds = await getAllDescendantWBS(wbsId);
  console.log(`📋 Found ${allWBSIds.length} WBS items in tree, updating their tasks...`);

  // Update all tasks under these WBS items
  const result = await prisma.task.updateMany({
    where: { 
      wbs_id: { in: allWBSIds },
      status: { not: 'completed' } // Only update incomplete tasks
    },
    data: { 
      status: 'completed',
      progress_percentage: 100
    }
  });

  console.log(`✅ Updated ${result.count} tasks to completed`);
}

/**
 * @swagger
 * /api/wbs/{wbs_id}:
 *   put:
 *     summary: Update a WBS entry
 *     description: Updates an existing WBS entry by ID
 *     tags:
 *       - WBS
 *     parameters:
 *       - in: path
 *         name: wbs_id
 *         required: true
 *         description: ID of the WBS entry to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the WBS entry
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this WBS belongs to
 *               parent_wbs_id:
 *                 type: integer
 *                 description: ID of the parent WBS
 *               wbs_code:
 *                 type: string
 *                 description: WBS code identifier
 *               level:
 *                 type: integer
 *                 description: Level of the WBS
 *               progress_percentage:
 *                 type: number
 *                 format: float
 *                 description: Progress percentage
 *     responses:
 *       200:
 *         description: WBS entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wbs_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 wbs_code:
 *                   type: string
 *       500:
 *         description: Server error
 */
// PUT update WBS
export async function PUT(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const data = await req.json();
    
    console.log(`🚀 WBS PUT REQUEST STARTED for WBS ${wbs_id}`);
    console.log(`📥 Request data:`, data);
    
    // Extract WBS fields and budget amount from the request data
    const {
      name,
      description,
      status,
      progress_percentage,
      progress_weight,
      start_date,
      end_date,
      budget_amount,
    } = data;

    // Validate dates: start date cannot be later than end date
    if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        if (start > end) {
            return NextResponse.json(
                { error: 'Start date cannot be later than end date' },
                { status: 400 }
            );
        }
    }
    
    // Prepare data object with only valid WBS fields
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;
    if (progress_weight !== undefined) updateData.progress_weight = progress_weight == null || progress_weight === '' ? null : Number(progress_weight);
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = new Date(end_date);

    // ✅ NEW: If status is being set to "completed", also set progress to 100%
    if (status === 'completed' && progress_percentage === undefined) {
      updateData.progress_percentage = 100;
      console.log(`📊 Status set to completed, automatically setting progress to 100%`);
    }

    // Check if this WBS item has children (is a parent)
    const children = await prisma.wBS.findMany({
      where: { parent_wbs_id: parseInt(wbs_id) }
    });

    console.log(`👶 WBS ${wbs_id} has ${children.length} children`);

    if (progress_percentage !== undefined && children.length > 0) {
      return NextResponse.json(
        { error: "Cannot manually update progress percentage for parent WBS items. Progress is automatically calculated from children." },
        { status: 400 }
      );
    }

    // Update WBS
    console.log(`💾 Updating WBS ${wbs_id} with:`, updateData);
    const updatedWBS = await prisma.wBS.update({
      where: { wbs_id: parseInt(wbs_id) },
      data: updateData,
    });
    console.log(`✅ WBS ${wbs_id} updated successfully`);

    // ✅ NEW: If status changed to "completed", cascade to children and tasks
    if (status === 'completed') {
      console.log(`🔄 Status changed to completed, cascading to children and tasks...`);
      
      // Update all child WBS items to completed
      if (children.length > 0) {
        console.log(`📦 Updating ${children.length} child WBS items to completed...`);
        
        for (const child of children) {
          await prisma.wBS.update({
            where: { wbs_id: child.wbs_id },
            data: { 
              status: 'completed',
              progress_percentage: 100
            }
          });
          console.log(`  ✅ Child WBS ${child.wbs_id} (${child.name}) marked as completed`);
          
          // Recursively update grandchildren
          await cascadeCompletionToChildren(child.wbs_id);
        }
      }

      // Update all tasks under this WBS (and children) to completed
      await cascadeCompletionToTasks(parseInt(wbs_id));
    }

    // If progress_percentage, status, or progress_weight was updated, update parent WBS and project
    if (progress_percentage !== undefined || status !== undefined || progress_weight !== undefined) {
      console.log(`🔄 Progress, status, or weight changed, updating parent chain...`);
      await updateParentProgress(parseInt(wbs_id));

      // Also update project progress
      const currentWBS = await prisma.wBS.findUnique({
        where: { wbs_id: parseInt(wbs_id) },
        select: { project_id: true, parent_wbs_id: true }
      });
      
      if (currentWBS?.project_id) {
        console.log(`🎯 Updating project ${currentWBS.project_id} progress...`);
        await updateProjectProgress(currentWBS.project_id);
      }
    }

    // Handle budget update if budget_amount is provided
    if (budget_amount !== undefined) {
      console.log(`💰 Updating budget to ${budget_amount}...`);
      
      // Get the current WBS to check level and parent
      const currentWBS = await prisma.wBS.findUnique({
        where: { wbs_id: parseInt(wbs_id) },
        select: { 
          level: true, 
          parent_wbs_id: true, 
          project_id: true,
          name: true
        }
      });
      
      if (!currentWBS) {
        return NextResponse.json(
          { error: "WBS not found" },
          { status: 404 }
        );
      }
      
      // Validate budget constraints
      const validateWBSBudget = async (
        projectId: number, 
        level: number, 
        parentWbsId: number | null, 
        requestedBudget: number,
        wbsName: string,
        currentWbsId?: number
      ) => {
        // Get project budget for reference
        const project = await prisma.project.findUnique({
          where: { project_id: projectId },
          select: { budget_amount: true }
        });

        if (!project) {
          return { isValid: false, message: "Project not found" };
        }

        // Level 0 validation: Must be exactly the project budget
        if (level === 0) {
          if (requestedBudget !== project.budget_amount) {
            return { 
              isValid: false, 
              message: `Level 0 WBS must have exactly the project budget amount: OMR ${project.budget_amount.toLocaleString()}` 
            };
          }
          return { isValid: true };
        }

        // Validate parent exists for levels > 0
        if (!parentWbsId) {
          return { isValid: false, message: "Parent WBS ID is required for levels greater than 0" };
        }

        // For levels > 0, check if parent has enough budget
        const parent = await prisma.wBS.findUnique({
          where: { wbs_id: parentWbsId },
          include: {
            budgets: true,
            children: {
              include: {
                budgets: true
              }
            }
          }
        });

        if (!parent) {
          return { isValid: false, message: "Parent WBS not found" };
        }

        // Get parent's budget
        const parentBudget = parent.budgets[0]?.planned_amount || 0;
        
        // Calculate sum of existing children's budgets (excluding the current one being updated)
        const existingChildrenBudgetSum = parent.children.reduce((sum, child) => {
          // Skip the current WBS being updated
          if (currentWbsId && child.wbs_id === currentWbsId) {
            return sum;
          }
          const childBudget = child.budgets[0]?.planned_amount || 0;
          return sum + childBudget;
        }, 0);
        
        // Calculate available budget
        const availableBudget = parentBudget - existingChildrenBudgetSum;
        
        // Check if requested budget exceeds available budget
        if (requestedBudget > availableBudget) {
          return { 
            isValid: false, 
            message: `Budget amount exceeds available budget. Available: OMR ${availableBudget.toLocaleString()}, Requested: OMR ${requestedBudget.toLocaleString()}`,
            availableBudget 
          };
        }

        return { isValid: true, availableBudget };
      };
      
      // Validate budget
      const budgetValidation = await validateWBSBudget(
        currentWBS.project_id,
        currentWBS.level,
        currentWBS.parent_wbs_id,
        budget_amount,
        currentWBS.name,
        parseInt(wbs_id)
      );
      
      if (!budgetValidation.isValid) {
        return NextResponse.json(
          { error: budgetValidation.message },
          { status: 400 }
        );
      }
      
      // First, check if there's an existing budget for this WBS
      const existingBudget = await prisma.budget.findFirst({
        where: { 
          wbs_id: parseInt(wbs_id),
          cost_type: 'General'
        }
      });

      if (existingBudget) {
        // Update existing budget
        await prisma.budget.update({
          where: { budget_id: existingBudget.budget_id },
          data: { 
            planned_amount: budget_amount,
            variance: budget_amount - existingBudget.actual_amount
          }
        });
        console.log(`✅ Budget updated for WBS ${wbs_id}`);
      } else {
        // Create new budget entry
        await prisma.budget.create({
          data: {
            project_id: currentWBS.project_id,
            wbs_id: parseInt(wbs_id),
            cost_type: 'General',
            planned_amount: budget_amount,
            actual_amount: 0,
            variance: budget_amount,
            threshold: 0,
            fiscal_year: new Date().getFullYear(),
            fiscal_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
          }
        });
        console.log(`✅ Budget created for WBS ${wbs_id}`);
      }
    }

    console.log(`🎉 WBS ${wbs_id} update completed successfully`);
    return NextResponse.json(updatedWBS);
  } catch (error) {
    console.error('❌ WBS Update Error:', error);
    return NextResponse.json(
      { error: "Failed to update WBS: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// ✅ NEW: Helper function to recursively cascade completion to all children
async function cascadeCompletionToChildren(wbsId: number): Promise<void> {
  const children = await prisma.wBS.findMany({
    where: { parent_wbs_id: wbsId }
  });

  for (const child of children) {
    await prisma.wBS.update({
      where: { wbs_id: child.wbs_id },
      data: { 
        status: 'completed',
        progress_percentage: 100
      }
    });
    console.log(`  ✅ Grandchild WBS ${child.wbs_id} (${child.name}) marked as completed`);
    
    // Recurse for deeper levels
    await cascadeCompletionToChildren(child.wbs_id);
  }
}

// Helper function to recursively delete WBS and its children
async function cascadeDeleteWBS(wbsId: number): Promise<number> {
  let deletedCount = 0;
  
  // First, get the WBS with its children
  const wbs = await prisma.wBS.findUnique({
    where: { wbs_id: wbsId },
    include: {
      children: true,
      tasks: true,
      budgets: true,
      documents: true,
      procurements: true,
      wbsItems: true,
      recurring_tasks: true
    }
  });

  if (!wbs) {
    return 0;
  }

  // Recursively delete children first
  for (const child of wbs.children) {
    try {
      deletedCount += await cascadeDeleteWBS(child.wbs_id);
    } catch (error) {
      console.error(`Error deleting child WBS with ID ${child.wbs_id}:`, error);
    }
  }

  // Delete related records first to avoid foreign key constraints
  // Delete recurring tasks first
  if (wbs.recurring_tasks.length > 0) {
    await prisma.recurringTask.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Delete tasks (which may have dependencies and other related records)
  if (wbs.tasks.length > 0) {
    // First delete task dependencies
    await prisma.taskDependency.deleteMany({
      where: { 
        OR: [
          { predecessor_task_id: { in: wbs.tasks.map(t => t.task_id) } },
          { successor_task_id: { in: wbs.tasks.map(t => t.task_id) } }
        ]
      }
    });

    // Delete task assignments
    await prisma.taskAssignment.deleteMany({
      where: { task_id: { in: wbs.tasks.map(t => t.task_id) } }
    });

    // Delete field data before resource assignments
    await prisma.fieldData.deleteMany({
      where: { task_id: { in: wbs.tasks.map(t => t.task_id) } }
    });

    // Delete resource assignments
    await prisma.resourceAssignment.deleteMany({
      where: { task_id: { in: wbs.tasks.map(t => t.task_id) } }
    });

    // Delete task comments and mentions
    const taskComments = await prisma.taskComment.findMany({
      where: { task_id: { in: wbs.tasks.map(t => t.task_id) } },
      select: { comment_id: true }
    });
    if (taskComments.length > 0) {
      await prisma.commentMention.deleteMany({
        where: { comment_id: { in: taskComments.map(c => c.comment_id) } }
      });
      await prisma.taskComment.deleteMany({
        where: { task_id: { in: wbs.tasks.map(t => t.task_id) } }
      });
    }

    // Delete field data
    await prisma.fieldData.deleteMany({
      where: { task_id: { in: wbs.tasks.map(t => t.task_id) } }
    });

    // Delete workflow rules
    await prisma.workflowRule.deleteMany({
      where: { 
        OR: [
          { trigger_task_id: { in: wbs.tasks.map(t => t.task_id) } },
          { action_target_id: { in: wbs.tasks.map(t => t.task_id) } }
        ]
      }
    });

    // Finally delete tasks
    await prisma.task.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Delete budgets
  if (wbs.budgets.length > 0) {
    await prisma.budget.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Delete documents
  if (wbs.documents.length > 0) {
    await prisma.document.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Delete procurements
  if (wbs.procurements.length > 0) {
    await prisma.procurement.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Delete WBS items
  if (wbs.wbsItems.length > 0) {
    await prisma.wBSItem.deleteMany({
      where: { wbs_id: wbsId }
    });
  }

  // Finally, delete the WBS itself
  await prisma.wBS.delete({
    where: { wbs_id: wbsId }
  });

  return deletedCount + 1;
}

/**
 * @swagger
 * /api/wbs/{wbs_id}:
 *   delete:
 *     summary: Delete a WBS entry
 *     description: Deletes a WBS entry by ID. Supports cascading delete with the cascade query parameter.
 *     tags:
 *       - WBS
 *     parameters:
 *       - in: path
 *         name: wbs_id
 *         required: true
 *         description: ID of the WBS entry to delete
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cascade
 *         required: false
 *         description: Whether to cascade delete children (true/false)
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: WBS entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: WBS deleted successfully
 *                 deletedCount:
 *                   type: integer
 *                   description: Number of WBS items deleted (including children)
 *       400:
 *         description: Cannot delete WBS with children (when cascade is false)
 *       404:
 *         description: WBS not found
 *       500:
 *         description: Server error
 */
// DELETE WBS
export async function DELETE(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    // Check user role for WBS modification permissions
    const { role } = await getUserFromHeaders();
    const allowedRoles = ['PJM', 'PMO', 'ADMIN'];
    
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Access denied. Only PJM, PMO, and ADMIN roles can delete WBS items." },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const url = new URL(req.url);
    const cascade = url.searchParams.get('cascade') === 'true';

    const wbsIdInt = parseInt(wbs_id);

    // Check if WBS exists
    const wbs = await prisma.wBS.findUnique({
      where: { wbs_id: wbsIdInt },
      include: {
        children: true,
        project: {
          select: { project_id: true }
        }
      }
    });

    if (!wbs) {
      return NextResponse.json(
        { error: "WBS not found" },
        { status: 404 }
      );
    }

    // Check if WBS has children and cascade is not enabled
    if (wbs.children.length > 0 && !cascade) {
      return NextResponse.json(
        { 
          error: "Cannot delete WBS with children. Use cascade=true to delete children as well, or delete child items first.",
          childrenCount: wbs.children.length
        },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    if (cascade) {
      // Use cascading delete
      deletedCount = await cascadeDeleteWBS(wbsIdInt);
    } else {
      // Regular delete (only works if no children)
      // Delete related records first
      
      // Delete recurring tasks first
      await prisma.recurringTask.deleteMany({
        where: { wbs_id: wbsIdInt }
      });

      // Get all tasks for this WBS to clean up their dependencies
      const tasks = await prisma.task.findMany({
        where: { wbs_id: wbsIdInt },
        select: { task_id: true }
      });

      if (tasks.length > 0) {
        const taskIds = tasks.map(t => t.task_id);
        
        // Delete task dependencies
        await prisma.taskDependency.deleteMany({
          where: { 
            OR: [
              { predecessor_task_id: { in: taskIds } },
              { successor_task_id: { in: taskIds } }
            ]
          }
        });

        // Delete task assignments
        await prisma.taskAssignment.deleteMany({
          where: { task_id: { in: taskIds } }
        });

        // Delete field data before resource assignments
        await prisma.fieldData.deleteMany({
          where: { task_id: { in: taskIds } }
        });

        // Delete resource assignments
        await prisma.resourceAssignment.deleteMany({
          where: { task_id: { in: taskIds } }
        });

        // Delete task comments and mentions
        const taskComments = await prisma.taskComment.findMany({
          where: { task_id: { in: taskIds } },
          select: { comment_id: true }
        });
        if (taskComments.length > 0) {
          await prisma.commentMention.deleteMany({
            where: { comment_id: { in: taskComments.map(c => c.comment_id) } }
          });
          await prisma.taskComment.deleteMany({
            where: { task_id: { in: taskIds } }
          });
        }

        // Delete workflow rules
        await prisma.workflowRule.deleteMany({
          where: { 
            OR: [
              { trigger_task_id: { in: taskIds } },
              { action_target_id: { in: taskIds } }
            ]
          }
        });
      }

      // Delete tasks
      await prisma.task.deleteMany({
        where: { wbs_id: wbsIdInt }
      });

      await prisma.budget.deleteMany({
        where: { wbs_id: wbsIdInt }
      });
      await prisma.document.deleteMany({
        where: { wbs_id: wbsIdInt }
      });
      await prisma.procurement.deleteMany({
        where: { wbs_id: wbsIdInt }
      });
      await prisma.wBSItem.deleteMany({
        where: { wbs_id: wbsIdInt }
      });

      await prisma.wBS.delete({
        where: { wbs_id: wbsIdInt }
      });
      deletedCount = 1;
    }

    // Update parent progress after deletion
    if (wbs.parent_wbs_id) {
      await updateParentProgress(wbs.parent_wbs_id);
    }

    // Recalculate all parent progress for the project
    await recalculateAllParentProgress(wbs.project.project_id);

    return NextResponse.json(
      { 
        message: cascade && deletedCount > 1 
          ? `WBS and ${deletedCount - 1} children deleted successfully`
          : "WBS deleted successfully",
        deletedCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete WBS Error:', error);
    return NextResponse.json(
      { error: "Failed to delete WBS: " + (error as Error).message },
      { status: 500 }
    );
  }
}