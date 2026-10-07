import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { weightedProgressAverage } from '@/lib/wbs-progress-utils';

// Helper function to recalculate progress for all WBS items that have children (uses optional progress_weight)
async function recalculateAllParentProgress(projectId: number): Promise<void> {
  try {
    const allWBS = await prisma.wBS.findMany({
      where: { project_id: projectId },
      select: { wbs_id: true, parent_wbs_id: true, progress_percentage: true, progress_weight: true },
      orderBy: { level: 'desc' }
    });

    const parentsWithChildren = new Set<number>();
    allWBS.forEach((wbs: { wbs_id: number; parent_wbs_id: number | null }) => {
      if (wbs.parent_wbs_id) parentsWithChildren.add(wbs.parent_wbs_id);
    });

    for (const parentId of parentsWithChildren) {
      const children = allWBS.filter((w: { parent_wbs_id: number | null }) => w.parent_wbs_id === parentId);
      if (children.length === 0) continue;
      const items = children.map((c: { progress_percentage: number; progress_weight?: number | null }) => ({
        progress: c.progress_percentage,
        weight: c.progress_weight ?? null
      }));
      const averageProgress = weightedProgressAverage(items);
      await prisma.wBS.update({
        where: { wbs_id: parentId },
        data: { progress_percentage: averageProgress }
      });
    }

    const rootWBSList = await prisma.wBS.findMany({
      where: { project_id: projectId, parent_wbs_id: null },
      select: { progress_percentage: true, progress_weight: true }
    });
    if (rootWBSList.length > 0) {
      const rootItems = rootWBSList.map((w: { progress_percentage: number; progress_weight?: number | null }) => ({
        progress: w.progress_percentage,
        weight: w.progress_weight ?? null
      }));
      const projectProgress = weightedProgressAverage(rootItems);
      await prisma.project.update({
        where: { project_id: projectId },
        data: { progress_percentage: projectProgress }
      });
    }
  } catch (error) {
    console.error('Error recalculating parent progress:', error);
  }
}

/**
 * @swagger
 * /api/wbs:
 *   get:
 *     summary: Get all WBS (Work Breakdown Structure) entries
 *     description: Retrieves a list of all WBS entries with project, parent, and children relationships
 *     tags:
 *       - WBS
 *     responses:
 *       200:
 *         description: List of WBS entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   wbs_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   parent_wbs_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   wbs_code:
 *                     type: string
 *                   level:
 *                     type: integer
 *                   progress_percentage:
 *                     type: number
 *                     format: float
 *                   project:
 *                     type: object
 *                     description: Associated project details
 *                   parent:
 *                     type: object
 *                     description: Parent WBS details
 *                   children:
 *                     type: array
 *                     items:
 *                       type: object
 *                     description: Child WBS entries
 *       500:
 *         description: Server error
 */
// GET all WBS
export async function GET() {
  try {
    const wbsList = await prisma.wBS.findMany({
      include: {
        project: true,
        parent: true,
        children: true,
      },
    });
    return NextResponse.json(wbsList);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch WBS: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// Function to generate consistent WBS code
function generateWbsCode(level: number, wbsId: number, projectId: number) {
  return `WBS-${level}-${wbsId}-PROJ-${projectId}`;
}

// Helper function to validate WBS budget constraints
async function validateWBSBudget(
  projectId: number, 
  level: number, 
  parentWbsId: number | null, 
  requestedBudget: number,
  wbsName: string
): Promise<{ isValid: boolean; message?: string; availableBudget?: number }> {
  
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
  
  // Calculate sum of existing children's budgets (excluding the current one being created/updated)
  const existingChildrenBudgetSum = parent.children.reduce((sum, child) => {
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
}

/**
 * @swagger
 * /api/wbs:
 *   post:
 *     summary: Create a new WBS entry
 *     description: Creates a new WBS entry. If this is the first WBS for a project, automatically creates level 0 and initial level 1 WBS entries with budget allocations.
 *     tags:
 *       - WBS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - project_id
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the WBS entry
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this WBS belongs to
 *               level:
 *                 type: integer
 *                 description: Level of the WBS (0 for root, 1+ for sub-levels)
 *               parent_wbs_id:
 *                 type: integer
 *                 description: ID of the parent WBS (required for levels > 0)
 *               progress_percentage:
 *                 type: number
 *                 format: float
 *                 description: Progress percentage (defaults to 0)
 *     responses:
 *       201:
 *         description: WBS created successfully. If first WBS, returns both level 0 and level 1 entries.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     level0:
 *                       type: object
 *                       description: Level 0 WBS entry
 *                     level1:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Auto-created level 1 WBS entries (Design, Procurement, Execution, Testing & Commissioning, Handover)
 *                 - type: object
 *                   properties:
 *                     wbs_id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     wbs_code:
 *                       type: string
 *       400:
 *         description: Missing required fields or business rule violation
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
// POST new WBS
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.name || !data.project_id || data.level === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, project_id, and level are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { project_id: data.project_id },
      select: { 
        project_id: true, 
        start_date: true, 
        planned_end_date: true, 
        budget_amount: true 
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if level 0 WBS already exists for this project
    const existingLevel0WBS = await prisma.wBS.findFirst({
      where: {
        project_id: data.project_id,
        level: 0
      }
    });

    // If trying to create level 0 WBS but one already exists
    if (data.level === 0 && existingLevel0WBS) {
      return NextResponse.json(
        { error: "A level 0 WBS already exists for this project" },
        { status: 400 }
      );
    }

    // If level 0 doesn't exist and trying to create level 1, return error
    if (data.level === 1 && !existingLevel0WBS) {
      return NextResponse.json(
        { error: "Cannot create level 1 WBS before creating level 0 WBS" },
        { status: 400 }
      );
    }

    // Check if trying to create standard template items that already exist
    const templateNames = ["Design & Planning", "Procurement", "Execution", "Testing & Commissioning", "Handover & Closeout"];
    if (data.level === 1 && templateNames.includes(data.name)) {
      const existingTemplateItem = await prisma.wBS.findFirst({
        where: {
          project_id: data.project_id,
          level: 1,
          name: data.name
        }
      });

      if (existingTemplateItem) {
        return NextResponse.json(
          { error: `Template item "${data.name}" already exists for this project. You cannot create template items again.` },
          { status: 409 }
        );
      }
    }

    // Check if this is the first WBS for this project
    const existingWBS = await prisma.wBS.findFirst({
      where: {
        project_id: data.project_id
      }
    });

    // If no WBS exists, only allow creation of level 0 (root) WBS with full constraints
    if (!existingWBS) {
      // Enforce: must be level 0
      if (data.level !== 0) {
        return NextResponse.json(
          { error: "The first WBS for a project must be a root (level 0) WBS." },
          { status: 400 }
        );
      }
      // Enforce: budget must match project budget
      if (data.budget_amount !== project.budget_amount) {
        return NextResponse.json(
          { error: `Root WBS budget must match project budget: OMR ${project.budget_amount}` },
          { status: 400 }
        );
      }
      // Always use project start/end dates for root WBS
      data.start_date = project.start_date;
      data.end_date = project.planned_end_date;
      // ... existing logic for creating root and level 1 WBS ...
    }

    // const sumOfBudgetAmounts = await prisma.wBS.findMany({
    //   where: {
    //     level: 1,
    //     project_id: data.project_id
    //   },
    //   select: {
    //     budgets: true
    // });

    // For non-initial WBS creation (create with temporary code)
    // Validate budget constraints
    const budgetAmount = data.budget_amount || 0;
    
    const budgetValidation = await validateWBSBudget(
      data.project_id,
      data.level,
      data.parent_wbs_id || null,
      budgetAmount,
      data.name
    );

    if (!budgetValidation.isValid) {
      return NextResponse.json(
        { error: budgetValidation.message },
        { status: 400 }
      );
    }

    // Get project budget and dates for threshold calculation
    const projectForBudget = await prisma.project.findUnique({
      where: { project_id: data.project_id },
      select: { 
        budget_amount: true,
        start_date: true,
        planned_end_date: true
      }
    });

    if (!projectForBudget) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // REMOVED date validation since end_date will be null and calculated from tasks

    const thresholdAmount = 0; // Set threshold to 0 as per user preference

    const newWBS = await prisma.wBS.create({
      data: {
        name: data.name,
        description: data.description || "",
        project_id: data.project_id,
        level: data.level,
        parent_wbs_id: data.parent_wbs_id || null,
        wbs_code: "TEMP_CODE",
        status: "not_started",
        progress_percentage: data.progress_percentage || 0,
        ...(data.progress_weight != null && data.progress_weight !== "" && { progress_weight: Number(data.progress_weight) }),
        start_date: data.start_date ? new Date(data.start_date) : projectForBudget.start_date,
        end_date: null,
        budgets: {
          create: [
            {
              project_id: data.project_id,
              cost_type: "General",
              planned_amount: budgetAmount,
              actual_amount: 0,
              variance: 0,
              threshold: 0,
              fiscal_year: new Date().getFullYear(),
              fiscal_period: "Q1",
            }
          ]
        }
      },
    });

    // Update with the consistent code format
    const updatedWBS = await prisma.wBS.update({
      where: { wbs_id: newWBS.wbs_id },
      data: { wbs_code: generateWbsCode(data.level, newWBS.wbs_id, data.project_id) }
    });

    // Recalculate progress for all parent WBS items after creation
    await recalculateAllParentProgress(data.project_id);

    // Notify project manager and team that a new WBS node was created
    {
      const { userId } = await getUserFromHeaders();
      const projectInfo = await prisma.project.findUnique({
        where: { project_id: data.project_id },
        select: { manager_id: true, team_members: { select: { user_id: true } } }
      });
      if (projectInfo) {
        const recipients = Array.from(
          new Set([projectInfo.manager_id, ...projectInfo.team_members.map(tm => tm.user_id)])
        );
        for (const uid of recipients) {
          await prisma.notification.create({
            data: {
              user_id: uid,
              type: 'PROJECT_UPDATE',
              title: 'New WBS Node Created',
              message: `WBS "${updatedWBS.name}" was created in project ${data.project_id}`,
              priority: 'MEDIUM',
              created_by_id: userId,
              metadata: { project_id: data.project_id, wbs_id: updatedWBS.wbs_id }
            }
          });
        }
      }
    }

    return NextResponse.json(updatedWBS, { status: 201 });
  } catch (error) {
    console.error("WBS Creation Error:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create WBS: " + (error as Error).message,
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}