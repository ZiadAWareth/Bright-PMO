import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/users/{user_id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieve a specific user by their ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 role:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// Get user by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { userId, role } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { user_id } = resolvedParams;
    
    // Allow ADMIN, PMO, HR, and DIR to view any user profile
    const canViewAnyProfile = ['ADMIN', 'PMO', 'HR', 'DIR'].includes(role);
    if (userId !== parseInt(user_id) && !canViewAnyProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(user_id) },
      include: {
        account: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users/{user_id}:
 *   put:
 *     summary: Update a user
 *     description: Update a user's information
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: If provided, will be hashed before storage
 *     responses:
 *       200:
 *         description: User updated successfully
 *       500:
 *         description: Server error
 */
// Update user profile (self or by ADMIN)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { userId, role } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { user_id } = resolvedParams;
    const targetId = parseInt(user_id);
    const isAdmin = role === 'ADMIN';
    const isSelf = userId === targetId;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const accountData =
      body.account &&
      (body.account.first_name !== undefined ||
        body.account.last_name !== undefined ||
        body.account.phone_number !== undefined ||
        body.account.department !== undefined)
        ? {
            first_name: body.account.first_name,
            last_name: body.account.last_name,
            phone_number: body.account.phone_number,
            department: body.account.department,
          }
        : undefined;

    const updatedUser = await prisma.user.update({
      where: { user_id: targetId },
      data: {
        ...(body.role_id !== undefined && { role_id: body.role_id }),
        ...(accountData && {
          account: {
            update: {
              ...(accountData.first_name !== undefined && { first_name: accountData.first_name }),
              ...(accountData.last_name !== undefined && { last_name: accountData.last_name }),
              ...(accountData.phone_number !== undefined && { phone_number: accountData.phone_number }),
              ...(accountData.department !== undefined && { department: accountData.department }),
            },
          },
        }),
      },
      include: {
        account: true,
        role: true,
      },
    });

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users/{user_id}:
 *   delete:
 *     summary: Delete a user
 *     description: Delete a specific user by their ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       500:
 *         description: Server error
 */
// Delete user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { userId, role } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { user_id } = resolvedParams;
    
    // Only allow admins to delete users
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { user_id: parseInt(user_id) },
    });

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 