import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { isS3Configured, uploadBuffer } from "@/lib/s3-upload";

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents
 *     description: Retrieves a list of all documents
 *     tags:
 *       - Documents
 *     responses:
 *       200:
 *         description: List of documents retrieved successfully
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
 *                   uploaded_at:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *                   wbs:
 *                     type: object
 *                   task:
 *                     type: object
 *                   uploader:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url || "", "http://localhost");
    const allVersions = url.searchParams.get("allVersions");
    const documentId = url.searchParams.get("document_id");

    if (allVersions && documentId) {
      // Fetch the document and all its previous versions (parent chain)
      let versions = [];
      let current = await prisma.document.findUnique({
        where: { document_id: Number(documentId) },
        include: { project: true, wbs: true, task: true, uploader: true }
      });
      while (current) {
        versions.push(current);
        if (!current.parent_document_id) break;
        current = await prisma.document.findUnique({
          where: { document_id: current.parent_document_id },
          include: { project: true, wbs: true, task: true, uploader: true }
        });
      }
      return NextResponse.json(versions, { status: 200 });
    }

    // Default: fetch all latest documents
    const documents = await prisma.document.findMany({
      include: {
        project: true,
        wbs: true,
        task: true,
        uploader: true,
      },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a document file to a project
 *     description: Uploads a file, saves it to disk, and creates a document record in the database for a specific project.
 *     tags:
 *       - Documents
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - project_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               project_id:
 *                 type: string
 *                 description: The ID of the project to associate the document with
 *               description:
 *                 type: string
 *                 description: Optional description of the document
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       400:
 *         description: Missing fields or invalid input
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const project_id = formData.get("project_id") as string;
    const description = formData.get("description") as string | null;

    if (!project_id || !file) {
      return NextResponse.json({ error: "Missing required fields: project_id and file" }, { status: 400 });
    }

    const { userId } = await getUserFromHeaders();

    const account = await prisma.account.findUnique({
      where: { user_id: userId },
    });
    if (!account) {
      return NextResponse.json({ error: "User account not found" }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: Number(project_id) }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext);
    const fileName = `${baseName}_${timestamp}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let file_path: string;

    if (isS3Configured()) {
      file_path = await uploadBuffer(
        `uploads/${project.project_code}/documents/${fileName}`,
        buffer,
        file.type
      );
    } else {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', project.project_code, 'documents');
      fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      file_path = `/uploads/${project.project_code}/documents/${fileName}`;
    }

    const newDoc = await prisma.document.create({
      data: {
        name: fileName,
        description: description || null,
        file_path,
        file_type: file.type,
        size: file.size,
        project_id: Number(project_id),
        uploaded_by: account.account_id,
        version: 1,
      },
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

