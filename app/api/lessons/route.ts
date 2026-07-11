import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Get all lessons learned
 *     description: Retrieves a list of all lessons learned
 *     tags:
 *       - Lessons
 *     responses:
 *       200:
 *         description: List of lessons retrieved successfully
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
 *                   impact:
 *                     type: string
 *                   recommendations:
 *                     type: string
 *                   submitted_by:
 *                     type: integer
 *                   submitted_at:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *                   submitter:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const lessons = await prisma.lesson.findMany({
      include: {
        project: true,
        submitter: true,
      },
    });
    return NextResponse.json(lessons);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson learned
 *     description: Creates a new lesson learned record
 *     tags:
 *       - Lessons
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - title
 *               - description
 *               - category
 *               - impact
 *               - recommendations
 *               - submitted_by
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
 *       201:
 *         description: Lesson created successfully
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
 *         description: Missing required fields or other error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.project_id || !data.title || !data.description || 
        !data.category || !data.impact || !data.recommendations || 
        !data.submitted_by) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const newLesson = await prisma.lesson.create({
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

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 400 });
  }
}
