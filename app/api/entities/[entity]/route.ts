import { getEntityList } from '@/lib/server/entities';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/entities/{entity}:
 *   get:
 *     summary: Get entity data
 *     description: Retrieves data for a specific entity type
 *     tags:
 *       - Entities
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         description: Type of entity to retrieve
 *         schema:
 *           type: string
 *           enum: [projects, tasks, users, wbs, budgets, contracts, documents]
 *     responses:
 *       200:
 *         description: Entity data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 description: Entity data structure varies by entity type
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ entity: string }> }) {
  const resolvedParams = await context.params;
  const { entity } = resolvedParams;
  try {
    const data = await getEntityList(entity);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch entity data' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: { params: Promise<{ entity: string }> }) {
  const resolvedParams = await context.params;
  const { entity } = resolvedParams;
  // ... rest of the code ...
}

export async function DELETE(req: Request, context: { params: Promise<{ entity: string }> }) {
  const resolvedParams = await context.params;
  const { entity } = resolvedParams;
  // ... rest of the code ...
} 