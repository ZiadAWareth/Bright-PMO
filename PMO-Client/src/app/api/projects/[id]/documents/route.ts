import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/projects/{id}/documents:
 *   get:
 *     summary: Get all documents for a project
 *     description: Retrieves a list of all documents associated with a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve documents for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   document_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   file_path:
 *                     type: string
 *                   file_type:
 *                     type: string
 *                   size:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   task_id:
 *                     type: integer
 *                   uploaded_by:
 *                     type: integer
 *                   upload_date:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No documents found for this project
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const projectId = parseInt(id);

    const documents = await prisma.document.findMany({
      where: { project_id: projectId },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const projectId = parseInt(id);

    const body = await request.json();
    const { name, description, file_path, file_type, size, uploaded_by } = body;

    const document = await prisma.document.create({
      data: {
        name,
        description,
        file_path,
        file_type,
        size,
        project_id: projectId,
        uploaded_by,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

