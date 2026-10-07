import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieves the currently authenticated user's information
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized or missing user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// export async function GET() {
//   try {
//     // Get user ID from middleware-set headers
//     const { userId } = await getUserFromHeaders();
    
//     // Log the userId for debugging
//     console.log('User ID from headers:', userId);
    
//     if (!userId) {
//       return NextResponse.json(
//         { error: 'User ID not found' },
//         { status: 401 }
//       );
//     }

//     const user = await prisma.user.findUnique({
//       where: { user_id: userId },
//       include: {
//         role: true,
//         account: true,
//       },
//     });

//     if (!user) {
//       return NextResponse.json(
//         { error: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Remove sensitive data before sending the response
//     const { password_hash, ...userWithoutSensitiveData } = user;

//     return NextResponse.json({
//       user: userWithoutSensitiveData
//     });
//   } catch (error) {
//     console.error('Error in /api/auth/me:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch user: ' + (error as Error).message },
//       { status: 500 }
//     );
//   }
// } 

export async function GET() {
  try {
    // Get user ID from middleware-set headers
    const { userId } = await getUserFromHeaders();

    // Log the userId for debugging
    console.log('User ID from headers:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Fetch user and include the account and role relations
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        account: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.account) {
      return NextResponse.json(
        { error: 'Account not found for user' },
        { status: 404 }
      );
    }

    // Return the complete user object with account and role information
    const { password_hash, ...userWithoutSensitiveData } = user;

    return NextResponse.json({
      user: userWithoutSensitiveData,
      user_id: user.user_id,
      account_id: user.account.account_id
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user: ' + (error as Error).message },
      { status: 500 }
    );
  }
}