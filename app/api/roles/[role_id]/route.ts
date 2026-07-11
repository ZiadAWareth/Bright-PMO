import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/roles/{role_id}:
 *   get:
 *     summary: Get a role by ID
 *     description: Retrieves a specific role by its ID
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         description: ID of the role to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
// GET single role by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ role_id: string }> }
) {
  const resolvedParams = await context.params;
  const { role_id } = resolvedParams;
  try {
    const role = await prisma.role.findUnique({
      where: { role_id: parseInt(role_id) },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch role: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/roles/{role_id}:
 *   put:
 *     summary: Update a role
 *     description: Updates an existing role by ID
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         description: ID of the role to update
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
 *                 description: Name of the role
 *               description:
 *                 type: string
 *                 description: Description of the role
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       500:
 *         description: Server error
 */
// PUT update role
export async function PUT(
  req: Request,
  context: { params: Promise<{ role_id: string }> }
) {
  const resolvedParams = await context.params;
  const { role_id } = resolvedParams;
  try {
    const data = await req.json();
    const updatedRole = await prisma.role.update({
      where: { role_id: parseInt(role_id) },
      data,
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update role: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/roles/{role_id}:
 *   delete:
 *     summary: Delete a role
 *     description: Deletes a role by ID. Cannot delete roles that are assigned to users.
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         description: ID of the role to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role deleted successfully
 *       400:
 *         description: Cannot delete role that is assigned to users
 *       500:
 *         description: Server error
 */
// DELETE role
export async function DELETE(
  req: Request,
  context: { params: Promise<{ role_id: string }> }
) {
  const resolvedParams = await context.params;
  const { role_id } = resolvedParams;
  try {
    // Check if role is being used by any users
    const usersWithRole = await prisma.user.findFirst({
      where: { role_id: parseInt(role_id) },
    });

    if (usersWithRole) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      );
    }

    await prisma.role.delete({
      where: { role_id: parseInt(role_id) },
    });

    return NextResponse.json(
      { message: 'Role deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete role: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 