import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/lessons/{lesson_id}:
 *   get:
 *     summary: Get a lesson learned by ID
 *     description: Retrieves a specific lesson learned by its ID
 *     tags:
 *       - Lessons
 *     parameters:
 *       - in: path
 *         name: lesson_id
 *         required: true
 *         description: ID of the lesson to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lesson_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 category:
 *                   type: string
 *                 impact:
 *                   type: string
 *                 recommendations:
 *                   type: string
 *                 submitted_by:
 *                   type: integer
 *                 submitted_at:
 *                   type: string
 *                   format: date-time
 *                 project:
 *                   type: object
 *                 submitter:
 *                   type: object
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ lesson_id: string }> }) {
  const resolvedParams = await context.params;
  const { lesson_id } = resolvedParams;
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { lesson_id: Number(lesson_id) },
      include: {
        project: true,
        submitter: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/lessons/{lesson_id}:
 *   put:
 *     summary: Update a lesson learned
 *     description: Updates an existing lesson learned by ID
 *     tags:
 *       - Lessons
 *     parameters:
 *       - in: path
 *         name: lesson_id
 *         required: true
 *         description: ID of the lesson to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this lesson belongs to
 *               title:
 *                 type: string
 *                 description: Title of the lesson learned
 *               description:
 *                 type: string
 *                 description: Detailed description of the lesson
 *               category:
 *                 type: string
 *                 description: Category of the lesson (e.g., Technical, Process, Management)
 *               impact:
 *                 type: string
 *                 description: Impact level of the lesson (e.g., High, Medium, Low)
 *               recommendations:
 *                 type: string
 *                 description: Recommendations based on the lesson
 *               submitted_by:
 *                 type: integer
 *                 description: ID of the user who submitted the lesson
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lesson_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 title:
 *                   type: string
 *       400:
 *         description: Failed to update lesson
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ lesson_id: string }> }) {
  const resolvedParams = await context.params;
  const { lesson_id } = resolvedParams;
  try {
    const data = await req.json();
    const updatedLesson = await prisma.lesson.update({
      where: { lesson_id: Number(lesson_id) },
      data: {
        project_id: data.project_id,
        title: data.title,
        description: data.description,
        category: data.category,
        impact: data.impact,
        recommendations: data.recommendations,
        submitted_by: data.submitted_by,
      },
      include: {
        project: true,
        submitter: true,
      },
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/lessons/{lesson_id}:
 *   delete:
 *     summary: Delete a lesson learned
 *     description: Deletes a lesson learned by ID
 *     tags:
 *       - Lessons
 *     parameters:
 *       - in: path
 *         name: lesson_id
 *         required: true
 *         description: ID of the lesson to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lesson deleted successfully
 *                 deletedLesson:
 *                   type: object
 *       400:
 *         description: Failed to delete lesson
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ lesson_id: string }> }) {
  const resolvedParams = await context.params;
  const { lesson_id } = resolvedParams;
  try {
    const deletedLesson = await prisma.lesson.delete({
      where: { lesson_id: Number(lesson_id) },
    });

    return NextResponse.json({ message: "Lesson deleted successfully", deletedLesson });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 400 });
  }
}
