import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/projects/{id}/lessons:
 *   get:
 *     summary: Get all lessons learned for a project
 *     description: Retrieves a list of all lessons learned associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve lessons learned for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project lessons learned retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   lesson_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [Technical, Management, Communication, Risk, Budget, Schedule, Quality, Resources]
 *                   lesson_type:
 *                     type: string
 *                     enum: [Best Practice, Issue, Improvement]
 *                   impact:
 *                     type: string
 *                     enum: [High, Medium, Low]
 *                   recommendation:
 *                     type: string
 *                   documented_by:
 *                     type: integer
 *                   date_learned:
 *                     type: string
 *                     format: date
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No lessons found for this project
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  try {
    const lessons = await prisma.lesson.findMany({
      where: { project_id: parseInt(id) },
    });
    if (!lessons) {
      return NextResponse.json({ error: 'No lessons found for this project.' }, { status: 404 });
    }
    return NextResponse.json(lessons, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

