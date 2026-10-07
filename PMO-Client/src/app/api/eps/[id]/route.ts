import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/eps/{id}:
 *   get:
 *     summary: Get an EPS entry by ID
 *     description: Retrieves a specific EPS entry by its ID
 *     tags:
 *       - EPS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the EPS entry to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EPS entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eps_id:
 *                   type: integer
 *                 eps_code:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 level:
 *                   type: integer
 *                 parent_eps_id:
 *                   type: integer
 *       404:
 *         description: EPS entry not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  
  try {
    const eps = await prisma.ePS.findUnique({
      where: { eps_id: parseInt(id) },
      include: { 
        projects: true,
        parent: true  // Include parent EPS data
      }
    });
    
    if (!eps) {
      return NextResponse.json({ error: 'EPS does not exist!' }, { status: 404 });
    }
    
    return NextResponse.json(eps, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/eps/{id}:
 *   put:
 *     summary: Update an EPS entry
 *     description: Updates an existing EPS entry by ID
 *     tags:
 *       - EPS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the EPS entry to update
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
 *                 description: Name of the EPS entry
 *               description:
 *                 type: string
 *                 description: Description of the EPS entry
 *               level:
 *                 type: integer
 *                 description: Hierarchical level of the EPS entry
 *               parent_eps_id:
 *                 type: integer
 *                 description: ID of the parent EPS entry
 *     responses:
 *       200:
 *         description: EPS entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eps_id:
 *                   type: integer
 *                 eps_code:
 *                   type: string
 *                 name:
 *                   type: string
 *       404:
 *         description: EPS entry not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  const epsId = parseInt(id);

  // Validate the ID parameter
  if (isNaN(epsId) || epsId <= 0) {
    return NextResponse.json(
      { error: 'Invalid EPS ID provided' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { name, description, level, parent_eps_id } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a valid string' },
        { status: 400 }
      );
    }

    if (!level || typeof level !== 'number' || level < 1 || level > 5) {
      return NextResponse.json(
        { error: 'Level is required and must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate parent_eps_id if provided
    if (parent_eps_id !== null && parent_eps_id !== undefined) {
      if (typeof parent_eps_id !== 'number' || parent_eps_id <= 0) {
        return NextResponse.json(
          { error: 'Parent EPS ID must be a valid positive number' },
          { status: 400 }
        );
      }

      // Check if parent EPS exists
      const parentEps = await prisma.ePS.findUnique({
        where: { eps_id: parent_eps_id }
      });

      if (!parentEps) {
        return NextResponse.json(
          { error: 'Parent EPS does not exist' },
          { status: 400 }
        );
      }

      // Validate level hierarchy (parent level should be level - 1)
      if (parentEps.level !== level - 1) {
        return NextResponse.json(
          { error: `Parent EPS level must be ${level - 1} for a level ${level} EPS` },
          { status: 400 }
        );
      }

      // Prevent setting self as parent
      if (parent_eps_id === epsId) {
        return NextResponse.json(
          { error: 'EPS cannot be its own parent' },
          { status: 400 }
        );
      }
    }

    // Level 1 EPS should not have a parent
    if (level === 1 && parent_eps_id !== null && parent_eps_id !== undefined) {
      return NextResponse.json(
        { error: 'Level 1 EPS cannot have a parent' },
        { status: 400 }
      );
    }

    // Level > 1 EPS must have a parent
    if (level > 1 && (parent_eps_id === null || parent_eps_id === undefined)) {
      return NextResponse.json(
        { error: `Level ${level} EPS must have a parent` },
        { status: 400 }
      );
    }

    // Check if EPS exists before updating
    const existingEps = await prisma.ePS.findUnique({
      where: { eps_id: epsId },
      include: {
        children: true
      }
    });

    if (!existingEps) {
      return NextResponse.json(
        { error: 'EPS not found' },
        { status: 404 }
      );
    }

    // Validate sibling name uniqueness - check if another EPS with the same name exists under the same parent
    // (excluding the current EPS being updated)
    const trimmedName = name.trim();
    const existingSibling = await prisma.ePS.findFirst({
      where: {
        name: trimmedName,
        parent_eps_id: parent_eps_id || null, // null for root level (Level 1)
        eps_id: {
          not: epsId // Exclude the current EPS from the check
        }
      }
    });

    if (existingSibling) {
      const parentContext = parent_eps_id 
        ? ` under the same parent` 
        : ` at the root level (Level 1)`;
      return NextResponse.json(
        { 
          error: `An EPS node with the name "${trimmedName}" already exists${parentContext}. Please choose a different name.`,
          duplicateName: trimmedName,
          existingEpsId: existingSibling.eps_id
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Check if level is being changed and if this EPS has children
    const levelChanged = existingEps.level !== level;
    const hasChildren = existingEps.children && existingEps.children.length > 0;

    // If level is being changed and there are children, we need to adjust children's levels
    if (levelChanged && hasChildren) {
      const levelDifference = level - existingEps.level;
      
      // Validate that adjusting children won't exceed bounds
      const childLevels = existingEps.children.map(child => child.level);
      const minChildLevel = Math.min(...childLevels);
      const maxChildLevel = Math.max(...childLevels);
      const newMinChildLevel = minChildLevel + levelDifference;
      const newMaxChildLevel = maxChildLevel + levelDifference;
      
      if (newMinChildLevel < 1) {
        return NextResponse.json(
          { error: `Cannot change level: adjusting children would result in level below 1. Current min child level: ${minChildLevel}, would become: ${newMinChildLevel}` },
          { status: 400 }
        );
      }
      
      if (newMaxChildLevel > 5) {
        return NextResponse.json(
          { error: `Cannot change level: adjusting children would exceed maximum level of 5. Current max child level: ${maxChildLevel}, would become: ${newMaxChildLevel}` },
          { status: 400 }
        );
      }

      // Use transaction to ensure atomicity
      return await prisma.$transaction(async (tx) => {
        // Update the parent EPS
        const updatedEps = await tx.ePS.update({
          where: { eps_id: epsId },
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            level,
            parent_eps_id
          },
          include: {
            projects: true,
          }
        });

        // Recursively update all children's levels
        await updateChildrenLevels(tx, epsId, levelDifference);

        return NextResponse.json(updatedEps);
      });
    }

    // Update EPS without modifying eps_code (no children or level not changed)
    const updatedEps = await prisma.ePS.update({
      where: { eps_id: epsId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level,
        parent_eps_id
      },
      include: {
        projects: true,
      }
    });

    return NextResponse.json(updatedEps);
  } catch (error) {
    console.error('Error updating EPS:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'An EPS with this name already exists' },
          { status: 409 }
        );
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid reference to parent EPS' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update EPS' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/eps/{id}:
 *   delete:
 *     summary: Delete an EPS entry
 *     description: Deletes an EPS entry by ID
 *     tags:
 *       - EPS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the EPS entry to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EPS entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eps_id:
 *                   type: integer
 *                 eps_code:
 *                   type: string
 *                 name:
 *                   type: string
 *       404:
 *         description: EPS entry not found
 *       500:
 *         description: Server error
 */
// Helper function to recursively count all child EPS entries
async function countAllChildren(tx: any, parentEpsId: number): Promise<number> {
  const directChildren = await tx.ePS.findMany({
    where: { parent_eps_id: parentEpsId },
    select: { eps_id: true }
  });

  let totalCount = directChildren.length;
  
  // Recursively count grandchildren
  for (const child of directChildren) {
    totalCount += await countAllChildren(tx, child.eps_id);
  }

  return totalCount;
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  const epsId = parseInt(id);
  
  // Check if cascade delete is requested (query parameter)
  const url = new URL(req.url);
  const cascade = url.searchParams.get('cascade') === 'true';

  try {
    // Get the EPS to check if it exists and has children
    const eps = await prisma.ePS.findUnique({
      where: { eps_id: epsId },
      include: { 
        projects: true,
        children: {
          select: {
            eps_id: true,
            name: true,
            level: true
          }
        }
      }
    });

    if (!eps) {
      return NextResponse.json({ error: 'EPS not found' }, { status: 404 });
    }

    // Count all children recursively (including grandchildren, etc.)
    const totalChildCount = await prisma.$transaction(async (tx) => {
      return await countAllChildren(tx, epsId);
    });

    // If EPS has children and cascade delete is not explicitly requested
    if (totalChildCount > 0 && !cascade) {
      return NextResponse.json(
        { 
          error: `Cannot delete EPS "${eps.name}" because it has ${totalChildCount} child EPS ${totalChildCount === 1 ? 'entry' : 'entries'} (including nested children).`,
          children: eps.children,
          childCount: eps.children.length,
          totalChildCount: totalChildCount,
          requiresCascade: true,
          message: `To delete this EPS and all its children, use cascade delete. This will permanently delete ${totalChildCount + 1} EPS ${totalChildCount + 1 === 1 ? 'entry' : 'entries'} total.`
        },
        { status: 409 } // 409 Conflict - indicates resource conflict
      );
    }

    // Check if EPS has associated projects
    if (eps.projects && eps.projects.length > 0) {
      const projectCount = eps.projects.length;
      return NextResponse.json(
        { 
          error: `Cannot delete EPS "${eps.name}" because it has ${projectCount} associated ${projectCount === 1 ? 'project' : 'projects'}. Please reassign or delete all projects before deleting this EPS.`,
          projectCount: projectCount
        },
        { status: 409 }
      );
    }

    // Perform deletion (with cascade if requested)
    if (totalChildCount > 0 && cascade) {
      // Cascade delete: Delete parent and all children recursively
      await prisma.$transaction(async (tx) => {
        await deleteEPSAndChildren(tx, epsId);
      });

      return NextResponse.json({ 
        message: `EPS "${eps.name}" and ${totalChildCount} child ${totalChildCount === 1 ? 'EPS' : 'EPS entries'} deleted successfully`,
        deletedCount: totalChildCount + 1
      }, { status: 200 });
    } else {
      // Safe to delete - no children and no projects
      await prisma.ePS.delete({
        where: { eps_id: epsId }
      });

      return NextResponse.json({ 
        message: `EPS "${eps.name}" deleted successfully` 
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error deleting EPS:', error);
    
    // Handle foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete EPS: It is still referenced by other records. Please remove all references first.' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete EPS' },
      { status: 500 }
    );
  }
}

// Helper function to recursively update children EPS levels when parent level changes
async function updateChildrenLevels(tx: any, parentEpsId: number, levelDifference: number) {
  // Get all direct children
  const children = await tx.ePS.findMany({
    where: { parent_eps_id: parentEpsId }
  });

  // Update each child's level
  for (const child of children) {
    const newLevel = child.level + levelDifference;
    
    // Validate new level is within bounds
    if (newLevel < 1 || newLevel > 5) {
      throw new Error(`Cannot update child EPS ${child.eps_id}: new level ${newLevel} is out of bounds (1-5)`);
    }

    // Update the child's level
    await tx.ePS.update({
      where: { eps_id: child.eps_id },
      data: { level: newLevel }
    });

    // Recursively update grandchildren
    await updateChildrenLevels(tx, child.eps_id, levelDifference);
  }
}

// Helper function to recursively delete EPS and all its children
async function deleteEPSAndChildren(tx: any, epsId: number) {
  // Get all child EPS first
  const childEps = await tx.ePS.findMany({
    where: { parent_eps_id: epsId }
  });

  // Recursively delete all children first
  for (const child of childEps) {
    await deleteEPSAndChildren(tx, child.eps_id);
  }

  // Now delete all projects associated with this EPS
  const projects = await tx.project.findMany({
    where: { eps_level_id: epsId },
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

  // Delete each project and all its dependencies
  for (const project of projects) {
    await deleteProjectAndDependencies(tx, project);
  }

  // Finally, delete the EPS itself
  await tx.ePS.delete({
    where: { eps_id: epsId }
  });
}

// Helper function to delete a project and all its dependencies
async function deleteProjectAndDependencies(tx: any, project: any) {
  const projectId = project.project_id;

  // Delete task-related records first
  for (const wbs of project.wbs) {
    for (const task of wbs.tasks) {
      // Delete field data records for this task
      await tx.fieldData.deleteMany({
        where: { task_id: task.task_id }
      });

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
  for (const wbs of project.wbs) {
    await tx.wBSItem.deleteMany({
      where: { wbs_id: wbs.wbs_id }
    });
  }

  // Delete WBS structures
  await tx.wBS.deleteMany({
    where: { project_id: projectId }
  });

  // Delete risk mitigations first
  for (const risk of project.risks) {
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

  // Delete procurement contracts first
  for (const procurement of project.procurements) {
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
  for (const site of project.sites) {
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

  // Delete ProjectSetup
  await tx.projectSetup.deleteMany({
    where: { project_id: projectId }
  });

  // Finally delete the project
  await tx.project.delete({
    where: { project_id: projectId }
  });
}