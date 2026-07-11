import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

/**
 * @swagger
 * /api/projects/{id}/assign:
 *   post:
 *     summary: Assign a user to a project
 *     description: Assigns a user to a project as a team member with workload and lead status
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - workload
 *               - is_lead
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: ID of the user to assign
 *               workload:
 *                 type: number
 *                 description: User's workload percentage (0-100)
 *               is_lead:
 *                 type: boolean
 *                 description: Whether the user is a team lead
 *     responses:
 *       200:
 *         description: User assigned successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { user_id, workload, is_lead, role = '', department = '' } = body;

    // Calculate total workload for user across all projects
    const userProjectAssignments = await prisma.projectTeamMember.findMany({
      where: {
        user_id: user_id,
      },
      select: {
        workload: true,
      },
    });

    const currentTotalWorkload = userProjectAssignments.reduce((total, assignment) => total + (assignment.workload || 0), 0);
    
    if (currentTotalWorkload + workload > 100) {
      return NextResponse.json(
        { error: `Total workload would exceed 100%. Current: ${currentTotalWorkload}%, Adding: ${workload}%` },
        { status: 400 }
      );
    }

    // If is_lead is true, remove is_lead from all other team members in this project
    if (is_lead) {
      await prisma.projectTeamMember.updateMany({
        where: {
          project_id: parseInt(id),
          is_lead: true,
        },
        data: { is_lead: false },
      });
    }

    const projectTeamMember = await prisma.projectTeamMember.create({
      data: {
        project_id: parseInt(id),
        user_id: user_id,
        workload,
        is_lead: is_lead,
        role: role || '', // Use provided role or default empty
        department: department || '', // Use provided department or default empty
      },
      include: {
        user: {
          include: {
            account: true,
            role: true
          }
        },
      },
    });

    // Notify user of project assignment
    const project = await prisma.project.findUnique({ where: { project_id: parseInt(id) }, select: { name: true } });
    if (project) {
      await prisma.notification.create({
        data: {
          user_id: user_id,
          type: 'SYSTEM_ALERT',
          title: 'Added to Project',
          message: `You have been added to project "${project.name}"`,
          priority: 'LOW',
          created_by_id: currentUserId,
          metadata: { project_id: parseInt(id) }
        }
      });
    }

    return NextResponse.json(projectTeamMember);
  } catch (error) {
    console.error("Error assigning user to project:", error);
    return NextResponse.json(
      { error: "Failed to assign user to project" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/projects/{id}/assign:
 *   delete:
 *     summary: Remove users from a project
 *     description: Removes one or more users from a project's team members
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to remove from the project
 *     responses:
 *       200:
 *         description: Users removed successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { userIds } = body;

    await prisma.projectTeamMember.deleteMany({
      where: {
        project_id: parseInt(id),
        user_id: {
          in: userIds,
        },
      },
    });

    // Notify users of project removal
    const project = await prisma.project.findUnique({ where: { project_id: parseInt(id) }, select: { name: true } });
    if (project) {
      await Promise.all(userIds.map((uid: number) =>
        prisma.notification.create({
          data: {
            user_id: uid,
            type: 'SYSTEM_ALERT',
            title: 'Removed from Project',
            message: `You have been removed from project "${project.name}"`,
            priority: 'LOW',
            created_by_id: currentUserId,
            metadata: { project_id: parseInt(id) }
          }
        })
      ));
    }

    return NextResponse.json({ message: "Users unassigned successfully" });
  } catch (error) {
    console.error("Error unassigning users from project:", error);
    return NextResponse.json(
      { error: "Failed to unassign users from project" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/projects/{id}/assign:
 *   patch:
 *     summary: Update a team member's details
 *     description: Updates workload, role, department, or lead status for an existing team member
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: ID of the user to update
 *               workload:
 *                 type: number
 *                 description: User's workload percentage (0-100)
 *               role:
 *                 type: string
 *                 description: User's role in the project
 *               department:
 *                 type: string
 *                 description: User's department
 *               is_lead:
 *                 type: boolean
 *                 description: Whether the user is a team lead
 *     responses:
 *       200:
 *         description: Team member updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Project or team member not found
 *       500:
 *         description: Server error
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { user_id, workload, is_lead, role, department } = body;

    // Check if team member exists
    const existingMember = await prisma.projectTeamMember.findFirst({
      where: {
        project_id: parseInt(id),
        user_id: user_id,
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // If workload is being updated, validate total workload
    if (workload !== undefined && workload !== null) {
      const userProjectAssignments = await prisma.projectTeamMember.findMany({
        where: {
          user_id: user_id,
        },
        select: {
          workload: true,
          project_id: true,
        },
      });

      // Calculate total workload excluding current project
      const currentTotalWorkload = userProjectAssignments
        .filter((assignment) => assignment.project_id !== parseInt(id))
        .reduce((total, assignment) => total + (assignment.workload || 0), 0);

      if (currentTotalWorkload + workload > 100) {
        return NextResponse.json(
          { error: `Total workload would exceed 100%. Current: ${currentTotalWorkload}%, Adding: ${workload}%` },
          { status: 400 }
        );
      }
    }

    // If is_lead is true, remove is_lead from all other team members in this project
    if (is_lead === true) {
      await prisma.projectTeamMember.updateMany({
        where: {
          project_id: parseInt(id),
          is_lead: true,
          user_id: { not: user_id }, // Don't update the current user
        },
        data: { is_lead: false },
      });
    }

    // Update the team member
    const updateData: any = {};
    if (workload !== undefined && workload !== null) updateData.workload = workload;
    if (role !== undefined) updateData.role = role || '';
    if (department !== undefined) updateData.department = department || '';
    if (is_lead !== undefined) updateData.is_lead = is_lead;

    const updatedMember = await prisma.projectTeamMember.update({
      where: {
        id: existingMember.id,
      },
      data: updateData,
      include: {
        user: {
          include: {
            account: true,
            role: true
          }
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}