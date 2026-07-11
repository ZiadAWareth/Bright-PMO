import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/tasks/{task_id}/assign:
 *   post:
 *     summary: Assign users to a task
 *     description: Assigns one or more users to a specific task
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to assign users to
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_ids
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to assign to the task
 *     responses:
 *       200:
 *         description: Users assigned successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const { userId, role } = await getUserFromHeaders();
    const user_role = req.headers.get("x-user-role")

    if (user_role !== "ADMIN" && user_role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const taskId = parseInt(task_id);
    const { user_ids } = await req.json();

    // Validate task exists and get task details (include project for approval check)
    const task = await prisma.task.findUnique({
      where: { task_id: taskId },
      include: {
        creator: true,
        wbs: { include: { project: { select: { status: true } } } }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Validate user_ids is an array
    if (!Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: "user_ids must be an array" },
        { status: 400 }
      );
    }

    // Check for existing assignments and filter out already assigned users
    const existingAssignments = await prisma.taskAssignment.findMany({
      where: {
        task_id: taskId,
        user_id: {
          in: user_ids
        }
      }
    });

    const alreadyAssignedUserIds = existingAssignments.map(assignment => assignment.user_id);
    const newUserIds = user_ids.filter(userId => !alreadyAssignedUserIds.includes(userId));

    // Get user details for notifications (only for newly assigned users)
    const users = await prisma.user.findMany({
      where: {
        user_id: {
          in: newUserIds
        }
      },
      include: {
        account: true
      }
    });

    // Get already assigned users
    const alreadyAssignedUsers = await prisma.taskAssignment.findMany({
      where: {
        task_id: taskId
      },
      include: {
        user: true
      }
    });

    // Only create assignments for users not already assigned
    const assignments = await Promise.all(
      newUserIds.map(userId =>
        prisma.taskAssignment.create({
          data: {
            task_id: taskId,
            user_id: userId
          }
        })
      )
    );

    // If no new assignments were created, return appropriate message
    if (newUserIds.length === 0) {
      return NextResponse.json({
        message: "All selected users are already assigned to this task",
        assignments: []
      });
    }

    // Only send assignment notifications when project is fully approved (execution or completed)
    const projectStatus = task.wbs?.project?.status;
    const projectFullyApproved =
      projectStatus === "execution" || projectStatus === "completed";

    if (projectFullyApproved) {
      const notificationPromises = users.map(user =>
        prisma.notification.create({
          data: {
            user_id: user.user_id,
            type: "TASK_ASSIGNMENT",
            title: "New Task Assignment",
            message: `You have been assigned to task "${task.name}"`,
            priority: "MEDIUM",
            created_by_id: 1,
            metadata: {
              task_id: taskId,
              task_name: task.name
            }
          }
        })
      );

      notificationPromises.push(
        prisma.notification.create({
          data: {
            user_id: task.created_by,
            type: "TASK_ASSIGNMENT",
            title: "Task Assignment Update",
            message: `${users.length} new user(s) assigned to task "${task.name}"`,
            priority: "MEDIUM",
            created_by_id: 1,
            metadata: {
              task_id: taskId,
              task_name: task.name,
              assigned_users: users.map(u => ({
                user_id: u.user_id,
                name: `${u.account?.first_name} ${u.account?.last_name}`
              }))
            }
          }
        })
      );

      for (const user of alreadyAssignedUsers) {
        notificationPromises.push(
          prisma.notification.create({
            data: {
              user_id: user.user_id,
              type: "TASK_ASSIGNMENT",
              title: "Task Assignment Update",
              message: `${users.length} new user(s) assigned to task "${task.name}"`,
              priority: "MEDIUM",
              created_by_id: 1,
              metadata: {
                task_id: taskId,
                task_name: task.name
              }
            }
          })
        );
      }

      await Promise.all(notificationPromises);
    }

    return NextResponse.json({
      message: "Users assigned successfully",
      assignments
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign users: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}/assign:
 *   delete:
 *     summary: Remove user assignments from a task
 *     description: Removes one or more user assignments from a specific task
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to remove assignments from
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_ids
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to remove from the task
 *     responses:
 *       200:
 *         description: Users removed successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const user_role = req.headers.get("x-user-role")

    if (user_role !== "ADMIN" && user_role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const taskId = parseInt(task_id);
    const { user_ids } = await req.json();

    // Validate task exists
    const task = await prisma.task.findUnique({
      where: { task_id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Validate user_ids is an array
    if (!Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: "user_ids must be an array" },
        { status: 400 }
      );
    }

    // Delete task assignments
    await Promise.all(
      user_ids.map(userId =>
        prisma.taskAssignment.deleteMany({
          where: {
            task_id: taskId,
            user_id: userId
          }
        })
      )
    );

    return NextResponse.json({
      message: "Users removed successfully"
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove users: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}/assign:
 *   get:
 *     summary: Get all users assigned to a task
 *     description: Retrieves all users currently assigned to a specific task
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to get assignments for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of assigned users
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const taskId = parseInt(task_id);

    // Validate task exists
    const task = await prisma.task.findUnique({
      where: { task_id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Get all assignments for the task with user details
    const assignments = await prisma.taskAssignment.findMany({
      where: { task_id: taskId },
      include: {
        user: {
          include: {
            role: true,
            account: true
          }
        }
      }
    });

    return NextResponse.json(assignments);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get assignments: " + (error as Error).message },
      { status: 500 }
    );
  }
}