import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/team-members:
 *   get:
 *     summary: Get project team members for mentions
 *     description: Returns all team members of a project that can be mentioned in comments
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Project ID
 *     responses:
 *       200:
 *         description: List of team members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   avatar:
 *                     type: string
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);

    // Get all team members for this project
    const teamMembers = await prisma.projectTeamMember.findMany({
      where: {
        project_id: projectId
      },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            email: true,
            account: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      }
    });

    // Also get users assigned to tasks in this project
    const taskAssignedUsers = await prisma.task.findMany({
      where: {
        wbs: {
          project_id: projectId
        }
      },
      include: {
        assigned_users: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true,
                email: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Combine and deduplicate users
    const allUsers = new Map();

    // Add team members
    teamMembers.forEach(member => {
      const user = member.user;
      if (user && user.account) {
        allUsers.set(user.user_id, {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          first_name: user.account.first_name,
          last_name: user.account.last_name,
          display_name: `${user.account.first_name} ${user.account.last_name}`,
          avatar: null // We can add avatar logic later
        });
      }
    });

    // Add task-assigned users
    taskAssignedUsers.forEach(task => {
      task.assigned_users.forEach(assignment => {
        const user = assignment.user;
        if (user && user.account) {
          allUsers.set(user.user_id, {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            first_name: user.account.first_name,
            last_name: user.account.last_name,
            display_name: `${user.account.first_name} ${user.account.last_name}`,
            avatar: null
          });
        }
      });
    });

    const users = Array.from(allUsers.values()).sort((a, b) => 
      a.display_name.localeCompare(b.display_name)
    );

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
} 