import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email, password, and username
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
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *               username:
 *                 type: string
 *                 description: User's display name
 *     responses:
 *       201:
 *         description: User successfully registered
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
 *                   type: string
 *       400:
 *         description: Missing required fields or user already exists
 *       500:
 *         description: Server error or default role not found
 */
export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default role (assuming 'USER' role exists)
    const defaultRole = await prisma.role.findFirst({
      where: { name: 'USER' },
    });

    if (!defaultRole) {
      return NextResponse.json(
        { error: 'Default role not found' },
        { status: 500 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
        role_id: defaultRole.role_id,
      },
      include: { role: true },
    });

    return NextResponse.json(
      {
        user_id: user.user_id,
        email: user.email,
        username: username,
        role: user.role.name,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to register: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 