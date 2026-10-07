import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { ActivityLogger } from '@/lib/activity-logger';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import type { Prisma } from '@prisma/client';

/**
 * @swagger
 * /api/eps:
 *   get:
 *     summary: Get all EPS (Enterprise Project Structure) entries
 *     description: Retrieves a list of all EPS entries
 *     tags:
 *       - EPS
 *     responses:
 *       200:
 *         description: List of EPS entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   eps_id:
 *                     type: integer
 *                   eps_code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   level:
 *                     type: integer
 *                   parent_eps_id:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
export async function GET() {
  const allEps = await prisma.ePS.findMany({
    include: {
      projects: true
    }
  });
  return NextResponse.json(allEps);
}

/**
 * @swagger
 * /api/eps:
 *   post:
 *     summary: Create a new EPS entry
 *     description: Creates a new Enterprise Project Structure entry
 *     tags:
 *       - EPS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the EPS entry
 *               description:
 *                 type: string
 *                 description: Description of the EPS entry
 *               level:
 *                 type: integer
 *                 description: Hierarchical level of the EPS entry
 *               parent_eps_id:
 *                 type: integer
 *                 description: ID of the parent EPS entry
 *     responses:
 *       201:
 *         description: EPS entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eps_id:
 *                   type: integer
 *                 eps_code:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const { userId } = await getUserFromHeaders();
    const body = await req.json();
    const { name, description, level, parent_eps_id } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a valid string' },
        { status: 400 }
      );
    }

    if (!level || typeof level !== 'number' || level < 1 || level > 5) {
      return NextResponse.json(
        { error: 'Level is required and must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate sibling name uniqueness - check if another EPS with the same name exists under the same parent
    const trimmedName = name.trim();
    const existingSibling = await prisma.ePS.findFirst({
      where: {
        name: trimmedName,
        parent_eps_id: parent_eps_id || null, // null for root level (Level 1)
      }
    });

    if (existingSibling) {
      const parentContext = parent_eps_id 
        ? ` under the same parent` 
        : ` at the root level (Level 1)`;
      return NextResponse.json(
        { 
          error: `An EPS node with the name "${trimmedName}" already exists${parentContext}. Please choose a different name.`,
          duplicateName: trimmedName,
          existingEpsId: existingSibling.eps_id
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create EPS without setting eps_code - let the database handle it
    const eps = await prisma.ePS.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        level,
        parent_eps_id,
      } as Prisma.EPSUncheckedCreateInput,
      include: {
        projects: true,
      }
    });

    // Log activity for EPS creation
    await ActivityLogger.log({
      user_id: userId,
      action: 'create',
      entity_type: 'eps',
      entity_id: eps.eps_id,
      title: `Created EPS "${eps.name}"`,
      description: `Created new EPS: ${eps.name}`,
      metadata: {
        entity_name: eps.name,
        additional_info: {
          level: eps.level,
          parent_eps_id: eps.parent_eps_id,
          eps_code: eps.eps_code,
          description: eps.description
        }
      }
    });

    return NextResponse.json(eps, { status: 201 });
  } catch (error) {
    console.error('Error creating EPS:', error);
    return NextResponse.json(
      { error: 'Failed to create EPS' },
      { status: 500 }
    );
  }
}


