import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { weightedProgressAverage } from "@/lib/wbs-progress-utils";

/**
 * @swagger
 * /api/wbs/bulk-delete:
 *   post:
 *     summary: Delete multiple WBS items
 *     description: Delete multiple WBS items and their children in a cascade manner
 *     tags: [WBS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               wbs_ids:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of WBS IDs to delete
 *     responses:
 *       200:
 *         description: WBS items deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    // Resolve authenticated app user via middleware headers
    const { userId } = await getUserFromHeaders();
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { error: "Invalid user context" },
        { status: 401 }
      );
    }

    // Check user permissions - only PMO, PJM, or ADMIN can delete WBS
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = await prisma.role.findUnique({
      where: { role_id: user.role_id },
    });

    if (!userRole || !["PMO", "PJM", "ADMIN"].includes(userRole.name)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only PMO, PJM, or ADMIN can delete WBS items." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { wbs_ids } = body;

    if (!wbs_ids || !Array.isArray(wbs_ids) || wbs_ids.length === 0) {
      return NextResponse.json(
        { error: "wbs_ids array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate all WBS IDs exist and are not root level (level 0)
    const wbsItems = await prisma.wBS.findMany({
      where: {
        wbs_id: { in: wbs_ids },
      },
      select: {
        wbs_id: true,
        level: true,
        name: true,
        wbs_code: true,
      },
    });

    if (wbsItems.length !== wbs_ids.length) {
      const foundIds = wbsItems.map(w => w.wbs_id);
      const missingIds = wbs_ids.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { error: `WBS items not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Check for root level items (level 0)
    const rootItems = wbsItems.filter(w => w.level === 0);
    if (rootItems.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete root level WBS items: ${rootItems.map(w => w.wbs_code).join(", ")}` },
        { status: 400 }
      );
    }

    // Helper function to get all descendants of a WBS item
    async function getAllDescendants(wbsId: number): Promise<number[]> {
      const children = await prisma.wBS.findMany({
        where: { parent_wbs_id: wbsId },
        select: { wbs_id: true },
      });

      let allDescendants = children.map((c) => c.wbs_id);

      for (const child of children) {
        const childDescendants = await getAllDescendants(child.wbs_id);
        allDescendants = allDescendants.concat(childDescendants);
      }

      return allDescendants;
    }

    // Collect all WBS IDs to delete (including descendants)
    const allWbsIdsToDelete = new Set<number>(wbs_ids);
    
    for (const wbsId of wbs_ids) {
      const descendants = await getAllDescendants(wbsId);
      descendants.forEach((id) => allWbsIdsToDelete.add(id));
    }

    const allWbsIdsArray = Array.from(allWbsIdsToDelete);

    // Perform cascade deletion within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete budgets associated with all WBS items
      await tx.budget.deleteMany({
        where: {
          wbs_id: { in: allWbsIdsArray },
        },
      });

      // 2. Delete procurements associated with all WBS items
      await tx.procurement.deleteMany({
        where: {
          wbs_id: { in: allWbsIdsArray },
        },
      });

      // 3. For each WBS item, get its tasks and delete task dependencies
      const tasks = await tx.task.findMany({
        where: { wbs_id: { in: allWbsIdsArray } },
        select: { task_id: true },
      });

      const taskIds = tasks.map((t) => t.task_id);

      if (taskIds.length > 0) {
        // Delete task dependencies
        await tx.taskDependency.deleteMany({
          where: {
            OR: [
              { predecessor_task_id: { in: taskIds } },
              { successor_task_id: { in: taskIds } },
            ],
          },
        });

        // Delete task assignments
        await tx.taskAssignment.deleteMany({
          where: { task_id: { in: taskIds } },
        });

        // Delete time entries for tasks
        await tx.timeEntry.deleteMany({
          where: { task_id: { in: taskIds } },
        });

        // Delete tasks
        await tx.task.deleteMany({
          where: { task_id: { in: taskIds } },
        });
      }

      // 4. Delete all WBS items in batches by level (children before parents)
      const wbsToDeleteOrdered = await tx.wBS.findMany({
        where: { wbs_id: { in: allWbsIdsArray } },
        orderBy: { level: 'desc' },
        select: { wbs_id: true, level: true },
      });

      const byLevel = new Map<number, number[]>();
      for (const wbs of wbsToDeleteOrdered) {
        const list = byLevel.get(wbs.level) ?? [];
        list.push(wbs.wbs_id);
        byLevel.set(wbs.level, list);
      }

      const levelsDesc = Array.from(byLevel.keys()).sort((a, b) => b - a);
      for (const level of levelsDesc) {
        const ids = byLevel.get(level)!;
        await tx.wBS.deleteMany({
          where: { wbs_id: { in: ids } },
        });
      }

      return {
        deletedCount: allWbsIdsArray.length,
        deletedWbsIds: allWbsIdsArray,
      };
    }, {
      timeout: 120000,
      maxWait: 10000,
    });

    // After successful deletion, update parent WBS progress if applicable
    // Get unique parent IDs from the deleted items
    const parentIds = new Set<number>();
    for (const wbsItem of wbsItems) {
      const fullWbs = await prisma.wBS.findUnique({
        where: { wbs_id: wbsItem.wbs_id },
        select: { parent_wbs_id: true },
      });
      if (fullWbs?.parent_wbs_id) {
        parentIds.add(fullWbs.parent_wbs_id);
      }
    }

    // Update progress for each parent
    for (const parentId of parentIds) {
      try {
        await updateParentProgress(parentId);
      } catch (error) {
        console.error(`Error updating parent WBS ${parentId} progress:`, error);
        // Continue with other parents even if one fails
      }
    }

    return NextResponse.json({
      message: "WBS items deleted successfully",
      deletedCount: result.deletedCount,
      deletedWbsIds: result.deletedWbsIds,
    });

  } catch (error: any) {
    console.error("Error in bulk delete WBS:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete WBS items" },
      { status: 500 }
    );
  }
}

// Helper function to update parent WBS progress (uses optional progress_weight); at root, updates project from all roots
async function updateParentProgress(parentWbsId: number) {
  const children = await prisma.wBS.findMany({
    where: { parent_wbs_id: parentWbsId },
    select: { progress_percentage: true, progress_weight: true },
  });

  if (children.length > 0) {
    const items = children.map((c) => ({
      progress: c.progress_percentage || 0,
      weight: c.progress_weight ?? null,
    }));
    const avgProgress = weightedProgressAverage(items);

    await prisma.wBS.update({
      where: { wbs_id: parentWbsId },
      data: { progress_percentage: avgProgress },
    });

    const parent = await prisma.wBS.findUnique({
      where: { wbs_id: parentWbsId },
      select: { parent_wbs_id: true, project_id: true },
    });

    if (parent?.parent_wbs_id) {
      await updateParentProgress(parent.parent_wbs_id);
    } else if (parent?.project_id) {
      const rootWBSList = await prisma.wBS.findMany({
        where: { project_id: parent.project_id, parent_wbs_id: null },
        select: { progress_percentage: true, progress_weight: true },
      });
      if (rootWBSList.length > 0) {
        const rootItems = rootWBSList.map((w) => ({
          progress: w.progress_percentage || 0,
          weight: w.progress_weight ?? null,
        }));
        const projectProgress = weightedProgressAverage(rootItems);
        await prisma.project.update({
          where: { project_id: parent.project_id },
          data: { progress_percentage: projectProgress },
        });
      }
    }
  }
}
