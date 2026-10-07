import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Updates WBS budget variance by recalculating from child budgets
 * This cascades up the hierarchy when planned budgets change
 */
async function updateWBSVarianceHierarchy(wbsId: number, tx?: any): Promise<void> {
  // If transaction context is provided, use it directly; otherwise start a new transaction
  if (tx) {
    // We're already in a transaction, use the provided context
    await updateWBSVarianceHierarchyInternal(wbsId, tx);
  } else {
    // Start a new transaction
    await prisma.$transaction(async (transaction) => {
      await updateWBSVarianceHierarchyInternal(wbsId, transaction);
    });
  }
}

async function updateWBSVarianceHierarchyInternal(wbsId: number, transaction: any): Promise<void> {
    // Get all child tasks for this WBS
    const childTasks = await transaction.task.findMany({
      where: { wbs_id: wbsId },
      include: {
        budgets: true
      }
    });

    // Get all child WBS elements for this WBS
    const childWBSElements = await transaction.wBS.findMany({
      where: { parent_wbs_id: wbsId },
      include: {
        budgets: true
      }
    });

    // Calculate total planned and actual amounts from children
    let totalPlannedAmount = 0;
    let totalActualAmount = 0;
    
    // Sum from child tasks
    childTasks.forEach((task: any) => {
      task.budgets.forEach((budget: any) => {
        totalPlannedAmount += budget.planned_amount;
        totalActualAmount += budget.actual_amount;
      });
    });

    // Sum from child WBS elements
    childWBSElements.forEach((childWBS: any) => {
      childWBS.budgets.forEach((budget: any) => {
        totalPlannedAmount += budget.planned_amount;
        totalActualAmount += budget.actual_amount;
      });
    });

    // Calculate new variance based on existing planned amount (don't overwrite manually set WBS budgets)
    const existingWBSBudget = await transaction.budget.findFirst({
      where: { 
        wbs_id: wbsId,
        cost_type: 'General'
      }
    });

    if (existingWBSBudget) {
      // Only update actual_amount and variance, preserve the manually set planned_amount
      const plannedAmount = existingWBSBudget.planned_amount; // Keep the manually set budget
      const newVariance = plannedAmount - totalActualAmount;
      
      await transaction.budget.update({
        where: { budget_id: existingWBSBudget.budget_id },
        data: { 
          // planned_amount: plannedAmount, // Don't update - keep manually set value
          actual_amount: totalActualAmount,
          variance: newVariance
        }
      });
    } else {
      // Create WBS budget entry if it doesn't exist
      // Use the sum of children as the planned amount only if no budget was manually set
      const wbs = await transaction.wBS.findUnique({
        where: { wbs_id: wbsId },
        select: { project_id: true }
      });

      if (wbs) {
        const newVariance = totalPlannedAmount - totalActualAmount;
        await transaction.budget.create({
          data: {
            project_id: wbs.project_id,
            wbs_id: wbsId,
            cost_type: 'General',
            planned_amount: totalPlannedAmount, // Only set from children if no budget exists
            actual_amount: totalActualAmount,
            variance: newVariance,
            threshold: 0,
            fiscal_year: new Date().getFullYear(),
            fiscal_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
          }
        });
      }
    }

    // Check if this WBS has a parent and update it recursively
    const currentWBS = await transaction.wBS.findUnique({
      where: { wbs_id: wbsId },
      select: { parent_wbs_id: true, project_id: true }
    });

    if (currentWBS?.parent_wbs_id) {
      // Recursively update the parent WBS variance (pass transaction context)
      await updateWBSVarianceHierarchyInternal(currentWBS.parent_wbs_id, transaction);
    } else if (currentWBS?.project_id) {
      // This is the root WBS (no parent), update the project's variance (pass transaction context)
      await updateProjectVariance(currentWBS.project_id, transaction);
    }
}

/**
 * Updates the project's budget variance by summing all root WBS variances
 */
async function updateProjectVariance(projectId: number, tx?: any): Promise<void> {
  const prismaClient = tx || prisma;
  
  // Get all root WBS (level 0) for this project
  const rootWBSItems = await prismaClient.wBS.findMany({
    where: { 
      project_id: projectId,
      parent_wbs_id: null // Root level
    },
    include: {
      budgets: true
    }
  });

  // For level 0 WBS, use its planned_amount as the project budget (it should match project budget)
  // Don't sum from children - the root WBS budget IS the project budget
  let totalProjectPlannedAmount = 0;
  let totalProjectActualAmount = 0;

  rootWBSItems.forEach((wbs: any) => {
    wbs.budgets.forEach((budget: any) => {
      // Use the WBS planned_amount (manually set constraint) as the project budget
      // For level 0, there should be only one root WBS, so we use its budget
      totalProjectPlannedAmount = Math.max(totalProjectPlannedAmount, budget.planned_amount);
      totalProjectActualAmount += budget.actual_amount;
    });
  });

  // If no root WBS budgets found, try to get the project budget directly
  if (totalProjectPlannedAmount === 0) {
    const project = await prismaClient.project.findUnique({
      where: { project_id: projectId },
      select: { budget_amount: true }
    });
    if (project) {
      totalProjectPlannedAmount = project.budget_amount;
    }
  }

  const projectVariance = totalProjectPlannedAmount - totalProjectActualAmount;

  // Update project's budget amount - use the root WBS budget (level 0), not sum of children
  await prismaClient.project.update({
    where: { project_id: projectId },
    data: { 
      budget_amount: totalProjectPlannedAmount, // This should be the level 0 WBS budget
      actual_cost: totalProjectActualAmount
    }
  });

  // Update project budget entry if it exists
  const existingProjectBudget = await prismaClient.budget.findFirst({
    where: { 
      project_id: projectId,
      wbs_id: null,
      task_id: null
    }
  });

  if (existingProjectBudget) {
    await prismaClient.budget.update({
      where: { budget_id: existingProjectBudget.budget_id },
      data: { 
        planned_amount: totalProjectPlannedAmount,
        actual_amount: totalProjectActualAmount,
        variance: projectVariance
      }
    });
  }
}

/**
 * @swagger
 * /api/budget/{id}:
 *   get:
 *     summary: Get a budget by ID
 *     description: Retrieves a specific budget by its ID
 *     tags:
 *       - Budgets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the budget to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 budget_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 cost_type:
 *                   type: string
 *                 planned_amount:
 *                   type: number
 *                   format: float
 *                 actual_amount:
 *                   type: number
 *                   format: float
 *                 project:
 *                   type: object
 *                 wbs:
 *                   type: object
 *                 task:
 *                   type: object
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  try {
    const budget = await prisma.budget.findUnique({
      where: { budget_id: Number(id) },
      include: {
        project: true, // Include related project data
        wbs: true,     // Include related WBS data
        task: true,    // Include related Task data
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/budget/{id}:
 *   put:
 *     summary: Update a budget
 *     description: Updates an existing budget by ID
 *     tags:
 *       - Budgets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the budget to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this budget belongs to
 *               wbs_id:
 *                 type: integer
 *                 description: Optional ID of the WBS this budget belongs to
 *               task_id:
 *                 type: integer
 *                 description: Optional ID of the task this budget belongs to
 *               cost_type:
 *                 type: string
 *                 description: Type of cost (e.g., Labor, Materials, Equipment)
 *               planned_amount:
 *                 type: number
 *                 format: float
 *                 description: Planned budget amount
 *               actual_amount:
 *                 type: number
 *                 format: float
 *                 description: Actual spent amount
 *               variance:
 *                 type: number
 *                 format: float
 *                 description: Variance between planned and actual
 *               fiscal_year:
 *                 type: integer
 *                 description: Fiscal year for this budget
 *               fiscal_period:
 *                 type: string
 *                 description: Fiscal period (e.g., Q1, Q2, Q3, Q4)
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 budget_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 cost_type:
 *                   type: string
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  const {
    project_id,
    wbs_id,
    task_id,
    cost_type,
    planned_amount,
    actual_amount,
    variance,
    fiscal_year,
    fiscal_period,
  } = await req.json();

  try {
    // If this is a WBS or Task budget update, validate against parent WBS total
    if ((wbs_id || task_id) && planned_amount !== undefined) {
      let wbsItem = null;
      let taskItem = null;
      
      if (wbs_id) {
        wbsItem = await prisma.wBS.findUnique({ where: { wbs_id: Number(wbs_id) } });
      } else if (task_id) {
        taskItem = await prisma.task.findUnique({ where: { task_id: Number(task_id) } });
      }

      // check if the wbs have children and validate
      if (wbs_id) {
        const wbs = await prisma.wBS.findUnique({ 
          where: { wbs_id: Number(wbs_id) },
          include: {
            children: { include: { budgets: true } },
            tasks: { include: { budgets: true } }
          }
        });
      
        if (wbs) {
          let childrenTotal = 0;
      
          // Sum all budgets on direct child WBSes
          for (const child of wbs.children) {
            childrenTotal += child.budgets.reduce((s, b) => s + b.planned_amount, 0);
          }
      
          // Sum all budgets on direct tasks of this WBS
          for (const task of wbs.tasks) {
            childrenTotal += task.budgets.reduce((s, b) => s + b.planned_amount, 0);
          }
      
          if (childrenTotal > planned_amount) {
            return NextResponse.json(
              {
                error: 'Budget validation failed',
                details: `The total planned budget for all direct children and direct tasks (OMR ${childrenTotal.toLocaleString()}) cannot exceed the new parent WBS budget (OMR ${planned_amount.toLocaleString()}). The WBS "${wbs.name}" has a budget limit of OMR ${planned_amount.toLocaleString()}.`,
                wbsName: wbs.name,
                wbsBudget: planned_amount,
                childrenTotal: childrenTotal,
              },
              { status: 400 }
            );
          }

          // check if level zero update the projects budget
          if (wbs.level === 0) {
            // Find the project's budget (should be only one per project)
            let projectBudget = await prisma.budget.findFirst({
              where: {
                project_id: wbs.project_id,
                wbs_id: null,
                task_id: null,
              }
            });
          
            if (projectBudget) {
              // Update the project's budget to match the new planned amount
              await prisma.budget.update({
                where: { budget_id: projectBudget.budget_id },
                data: {
                  planned_amount,
                  // Optionally update other fields if needed
                }
              });
            } else {
              // If not found, create it
              await prisma.budget.create({
                data: {
                  project_id: wbs.project_id,
                  planned_amount,
                  cost_type: 'PROJECT_BUDGET', // or whatever is appropriate
                  actual_amount: 0,
                  variance: 0,
                  fiscal_year: new Date().getFullYear(),
                  fiscal_period: 'Q1',
                }
              });
            }

            let project = await prisma.project.update({
              where: {
                project_id: wbs.project_id
              },
              data:{
                budget_amount: planned_amount
              }
            })
          }
        }
      }

      // check if level zero edit the total projects budget
      


      // Check if the WBS or Task has a parent for validation
      let parentWbs = null;

      if (wbsItem && wbsItem.parent_wbs_id) {
        parentWbs = await prisma.wBS.findUnique({
          where: { wbs_id: wbsItem.parent_wbs_id },
          include: { 
            budgets: true,
            children: { include: { budgets: true, tasks: { include: { budgets: true } } } },
            tasks: { include: {budgets: true }}
          },
        });  
      }
      else if(taskItem && taskItem.wbs_id){
        parentWbs = await prisma.wBS.findUnique({
          where: { wbs_id: taskItem.wbs_id },
          include: { 
            budgets: true,
            children: { include: { budgets: true, tasks: { include: { budgets: true } } } },
            tasks: { include: {budgets: true }}
          },
        }); 
      }

      // validate the parent total

      if (parentWbs) {
          
        const parentPlannedTotal = parentWbs.budgets.reduce((sum, b) => sum + b.planned_amount, 0);
        // Removed debugging log: "DEBUG: HAS Parent, PLANNED TOTAL"
        // Calculate the new total planned amount for all children (WBS and Tasks)
        let childrenTotal = 0;
        // Removed debugging log: "DEBUG: CHILDREN TOTAL"
        for (const childWbs of parentWbs.children) {
          // Sum budgets directly on the child WBS
          if (childWbs.wbs_id === Number(wbs_id)) {
            // For the WBS being updated, use the new planned amount from the request
            childrenTotal += planned_amount;
          } else {
            childrenTotal += childWbs.budgets.reduce((s, b) => s + b.planned_amount, 0);
          }

        }

        console.log("DEBUG TAKS COUNT, ",parentWbs.tasks.length)
        for (const task of parentWbs.tasks) {
          if (task.task_id === Number(task_id)) {
            // For the task being updated, use the new planned amount
             childrenTotal += planned_amount;
          }
          else {
            childrenTotal += task.budgets.reduce((s, b) => s + b.planned_amount, 0);
          }
        }

        if (childrenTotal > parentPlannedTotal) {
          return NextResponse.json(
            {
              error: 'Budget validation failed',
              details: `The total planned budget for all children (OMR ${childrenTotal.toLocaleString()}) cannot exceed the parent WBS budget (OMR ${parentPlannedTotal.toLocaleString()}). The parent WBS "${parentWbs.name}" has a budget limit of OMR ${parentPlannedTotal.toLocaleString()}.`,
              parentWbsName: parentWbs.name,
              parentWbsBudget: parentPlannedTotal,
              childrenTotal: childrenTotal,
            },
            { status: 400 }
          );
        }
      }
      }

    // Calculate variance server-side to ensure consistency
    const updateData: any = {
      project_id,
      wbs_id,
      task_id,
      cost_type,
      fiscal_year,
      fiscal_period,
    };

    // Add planned_amount if provided
    if (planned_amount !== undefined) {
      updateData.planned_amount = planned_amount;
    }

    // Add actual_amount if provided
    if (actual_amount !== undefined) {
      updateData.actual_amount = actual_amount;
    }

    // Get current budget to calculate variance
    const currentBudget = await prisma.budget.findUnique({
      where: { budget_id: Number(id) }
    });

    if (!currentBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Calculate new variance based on the updated values
    const newPlanned = planned_amount !== undefined ? planned_amount : currentBudget.planned_amount;
    const newActual = actual_amount !== undefined ? actual_amount : currentBudget.actual_amount;
    updateData.variance = newPlanned - newActual;

    const updatedBudget = await prisma.budget.update({
      where: { budget_id: Number(id) },
      data: updateData,
      include: {
        task: true,
        wbs: true
      }
    });

    // If planned amount was updated, cascade variance changes up the hierarchy
    if (planned_amount !== undefined) {
      try {
        if (updatedBudget.task_id && updatedBudget.task?.wbs_id) {
          // If this is a task budget, update the parent WBS variance hierarchy
          await updateWBSVarianceHierarchy(updatedBudget.task.wbs_id);
        } else if (updatedBudget.wbs_id) {
          // If this is a WBS budget, update its parent hierarchy if it has one
          const wbs = await prisma.wBS.findUnique({
            where: { wbs_id: updatedBudget.wbs_id },
            select: { parent_wbs_id: true, project_id: true }
          });
          
          if (wbs?.parent_wbs_id) {
            await updateWBSVarianceHierarchy(wbs.parent_wbs_id);
          } else if (wbs?.project_id) {
            // This is a root WBS, update project variance directly
            await updateProjectVariance(wbs.project_id);
          }
        } else if (updatedBudget.project_id && !updatedBudget.wbs_id && !updatedBudget.task_id) {
          // This is a project-level budget, no need to cascade up
          console.log('Project-level budget updated, no cascade needed');
        }
      } catch (cascadeError) {
        console.error('Error cascading variance changes:', cascadeError);
        // Don't fail the main update if cascade fails
      }
    }

    return NextResponse.json(updatedBudget);
  } catch (error: any) {
    console.error('Error updating budget:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/budget/{id}:
 *   delete:
 *     summary: Delete a budget
 *     description: Deletes a budget by ID
 *     tags:
 *       - Budgets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the budget to delete
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Budget deleted successfully (no content)
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  try {
    await prisma.budget.delete({
      where: { budget_id: Number(id) },
    });

    return new NextResponse(null, { status: 204 }); // No content
  } catch (error: any) {
    console.error('Error deleting budget:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}