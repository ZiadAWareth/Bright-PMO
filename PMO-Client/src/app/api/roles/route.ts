import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieves a list of all roles in the system
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   role_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
// GET all roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany();
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch roles: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a new role with the provided name and description
 *     tags:
 *       - Roles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the role (must be unique)
 *               description:
 *                 type: string
 *                 description: Description of the role
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *       400:
 *         description: Name is required or role already exists
 *       500:
 *         description: Server error
 */
// POST new role
export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await prisma.role.findFirst({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {} // Initialize with empty permissions object
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create role: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 