import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users with their accounts and roles.
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role_id:
 *                     type: string
 *                   status:
 *                     type: string
 *                   account:
 *                     type: object
 *                   role:
 *                     type: object
 *       500:
 *         description: Server error
 */
// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: { name: { not: 'SYSTEM' } } },
      include: {
        account: {
          select: {
            first_name: true,
            last_name: true,
            department: true,
          }
        },
        role: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with account details
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role_id
 *               - first_name
 *               - last_name
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               role_id:
 *                 type: string
 *               status:
 *                 type: string
 *                 default: active
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               department:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Username or email already exists
 *       500:
 *         description: Server error
 */
// POST new user
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Check if username exists
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: data.username,
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password_hash: hashedPassword, // Use the hashed password
        role_id: data.role_id,
        status: data.status || "active",
        account: {
          create: {
            first_name: data.first_name,
            last_name: data.last_name,
            department: data.department,
            phone_number: data.phone_number,
            is_active: true,
          },
        },
      },
      include: {
        account: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}