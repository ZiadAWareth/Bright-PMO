import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/documents/{document_id}:
 *   get:
 *     summary: Get a document by ID
 *     description: Retrieves a specific document by its ID with related project, WBS, task, and uploader information
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 file_path:
 *                   type: string
 *                 file_type:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 wbs_id:
 *                   type: integer
 *                 task_id:
 *                   type: integer
 *                 uploaded_by:
 *                   type: integer
 *                 upload_date:
 *                   type: string
 *                   format: date-time
 *                 project:
 *                   type: object
 *                   description: Associated project details
 *                 wbs:
 *                   type: object
 *                   description: Associated WBS details
 *                 task:
 *                   type: object
 *                   description: Associated task details
 *                 uploader:
 *                   type: object
 *                   description: User who uploaded the document
 *       404:
 *         description: Document not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ document_id: string }> }) {
  const resolvedParams = await context.params;
  const { document_id } = resolvedParams;
  try {
    const document = await prisma.document.findUnique({
      where: { document_id: Number(document_id) },
      include: {
        project: true,
        wbs: true,
        task: true,
        uploader: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}


/**
 * @swagger
 * /api/documents/{document_id}:
 *   delete:
 *     summary: Delete a document
 *     description: Deletes a document by ID
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Document deleted successfully
 *                 deletedDocument:
 *                   type: object
 *                   description: The deleted document
 *       400:
 *         description: Failed to delete document
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ document_id: string }> }) {
  const resolvedParams = await context.params;
  const { document_id } = resolvedParams;
  try {
    const deletedDocument = await prisma.document.delete({
      where: { document_id: Number(document_id) },
    });

    return NextResponse.json({ message: "Document deleted successfully", deletedDocument });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 400 });
  }
}
