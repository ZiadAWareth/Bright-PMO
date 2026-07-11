import { NextResponse } from 'next/server';
import { createToken } from '@/lib/jwt';
import { verifyToken } from '@/lib/jwt';
import {
  SESSION_HANDOFF_MAX_AGE,
  cookieBaseOptions,
} from '@/lib/idp-config';

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     description: Generates a new JWT token using an existing valid token
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT authentication token
 *       401:
 *         description: Token is missing or invalid
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const newToken = await createToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    const res = NextResponse.json({ token: newToken });
    const uid =
      typeof payload.userId === 'number'
        ? payload.userId
        : Number(payload.userId);
    if (Number.isFinite(uid)) {
      const cookieOpts = {
        ...cookieBaseOptions(),
        maxAge: SESSION_HANDOFF_MAX_AGE,
      };
      res.cookies.set('auth-token', newToken, cookieOpts);
      res.cookies.set('pmo-user-id', String(uid), cookieOpts);
    }
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh token: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 