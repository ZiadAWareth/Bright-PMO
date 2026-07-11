import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import {
  SESSION_HANDOFF_MAX_AGE,
  cookieBaseOptions,
} from '@/lib/idp-config';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     description: Logs in a user with email and password credentials
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.user_id,
      email: user.email,
      role: user.role.name,
    });

    const res = NextResponse.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role.name,
      },
    });

    const cookieOpts = {
      ...cookieBaseOptions(),
      maxAge: SESSION_HANDOFF_MAX_AGE,
    };
    res.cookies.set('auth-token', token, cookieOpts);
    res.cookies.set('pmo-user-id', String(user.user_id), cookieOpts);

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to login: ' + (error as Error).message },
      { status: 500 }
    );
  }
}


