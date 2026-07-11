import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { isS3Configured, uploadBuffer } from "@/lib/s3-upload";

/**
 * @swagger
 * /api/documents/uploadFile:
 *   post:
 *     summary: Upload a document file to a task or WBS
 *     description: Uploads a file, versions it, saves it to disk, and creates a document record in the database for a specific task or WBS item.
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               task_id:
 *                 type: integer
 *                 description: The ID of the task to associate the document with (either task_id or wbs_id required)
 *               wbs_id:
 *                 type: integer
 *                 description: The ID of the WBS to associate the document with (either task_id or wbs_id required)
 *               uploaded_by:
 *                 type: integer
 *                 description: The ID of the user uploading the file
 *               description:
 *                 type: string
 *                 description: Optional description of the document
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 document:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: Missing fields or invalid input
 *       404:
 *         description: Task, WBS, or project not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const task_id = formData.get("task_id") ? Number(formData.get("task_id") as String) : null;
  const wbs_id = formData.get("wbs_id") ? Number(formData.get("wbs_id") as String) : null;
  const project_id = formData.get("project_id") ? Number(formData.get("project_id") as String) : null;
  const uploaded_by = formData.get("uploaded_by") as string;
  const description = formData.get("description") as string | null;
  const category = formData.get("category") as string | null; // e.g., 'closure'
  const closure_document_type = formData.get("closure_document_type") as string | null;

  if ((!task_id && !wbs_id && !project_id) || !file) {
    return NextResponse.json({ error: "Missing fields: file and either task_id, wbs_id, or project_id required" }, { status: 400 });
  }

  const { userId } = await getUserFromHeaders();

  const account = await prisma.account.findUnique({
    where: { user_id: userId },
  });
  if (!account) {
    return NextResponse.json({ error: "User account not found" }, { status: 400 });
  }

  let project;
  let uploadDir;
  let publicPath;
  let searchCriteria: any = {};

  if (task_id) {
    // Handle task upload
    const task = await prisma.task.findUnique({
      where: { task_id: task_id },
      include: { wbs: true }
    });

    if (!task || !task.wbs) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    project = await prisma.project.findUnique({ where: { project_id: task.wbs.project_id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    uploadDir = path.join(process.cwd(), 'public', 'uploads', project.project_code, 'tasks', String(task_id));
    publicPath = `/uploads/${project.project_code}/tasks/${task_id}`;
    searchCriteria = { task_id: task_id };
  } else if (wbs_id) {
    // Handle WBS upload
    const wbs = await prisma.wBS.findUnique({
      where: { wbs_id: wbs_id },
      include: { project: true }
    });

    if (!wbs) {
      return NextResponse.json({ error: "WBS not found" }, { status: 404 });
    }

    project = wbs.project;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    uploadDir = path.join(process.cwd(), 'public', 'uploads', project.project_code, 'wbs', String(wbs_id));
    publicPath = `/uploads/${project.project_code}/wbs/${wbs_id}`;
    searchCriteria = { wbs_id: wbs_id };
  } else if (project_id) {
    // Handle project-level upload (e.g., closure documents)
    project = await prisma.project.findUnique({
      where: { project_id: project_id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const categoryFolder = category || 'general';
    uploadDir = path.join(process.cwd(), 'public', 'uploads', project.project_code, categoryFolder);
    publicPath = `/uploads/${project.project_code}/${categoryFolder}`;
    searchCriteria = { project_id: project_id };
  }

  // Versioning logic
  const ext = path.extname(file.name);
  const baseName = path.basename(file.name, ext);

  // Find latest document in DB for this task/wbs and baseName
  const parent = await prisma.document.findFirst({
    where: {
      ...searchCriteria,
      name: { startsWith: baseName },
    },
    orderBy: { version: 'desc' },
  });
  
  let version = 1;
  let parent_document_id = null;
  let fileName = file.name;
  if (parent) {
    version = parent.version + 1;
    parent_document_id = parent.document_id;
    fileName = `${baseName}_v${version}${ext}`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  let file_path: string;

  if (isS3Configured()) {
    if (task_id) {
      file_path = await uploadBuffer(
        `uploads/${project!.project_code}/tasks/${task_id}/${fileName}`,
        buffer,
        file.type
      );
    } else if (wbs_id) {
      file_path = await uploadBuffer(
        `uploads/${project!.project_code}/wbs/${wbs_id}/${fileName}`,
        buffer,
        file.type
      );
    } else {
      const categoryFolder = category || 'general';
      file_path = await uploadBuffer(
        `uploads/${project!.project_code}/${categoryFolder}/${fileName}`,
        buffer,
        file.type
      );
    }
  } else {
    fs.mkdirSync(uploadDir!, { recursive: true });
    const filePath = path.join(uploadDir!, fileName);
    fs.writeFileSync(filePath, buffer);
    file_path = `${publicPath}/${fileName}`;
  }

  // Save metadata to DB
  const documentData: any = {
    name: fileName,
    description: description || null,
    file_path,
    file_type: file.type,
    size: file.size,
    project_id: project!.project_id,
    uploaded_by: account.account_id,
    parent_document_id,
    version,
  };

  // Add task_id or wbs_id based on upload type
  if (task_id) {
    documentData.task_id = task_id;
  }
  if (wbs_id) {
    documentData.wbs_id = wbs_id;
  }

  const newDoc = await prisma.document.create({
    data: documentData,
  });

  return NextResponse.json({ success: true, document: newDoc });
}