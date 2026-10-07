import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isS3Configured, getObjectStream } from "@/lib/s3-upload";

export async function GET(req: Request) {
  const url = new URL(req.url || "", "http://localhost");
  const documentId = url.searchParams.get("documentId");
  const project_code = url.searchParams.get("project_code");
  const task_id = url.searchParams.get("task_id");
  const filename = url.searchParams.get("filename");

  try {
    // Download by document ID
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { document_id: Number(documentId) },
        include: {
          project: true,
          task: true,
          wbs: true
        }
      });

      if (!document || !document.project) {
        return NextResponse.json({ error: "Document or project not found" }, { status: 404 });
      }

      const originalName = document.name.includes('_') ? document.name.substring(0, document.name.lastIndexOf('_')) + path.extname(document.name) : document.name;
      const contentType = document.file_type || "application/octet-stream";
      const disposition = `attachment; filename="${originalName}"`;

      // Stored as full URL (e.g. public bucket) -> redirect
      if (document.file_path.startsWith("http")) {
        return NextResponse.redirect(document.file_path);
      }

      // S3 key (no leading slash) -> stream from S3
      if (isS3Configured() && !document.file_path.startsWith("/")) {
        const { body, contentType: s3ContentType } = await getObjectStream(document.file_path);
        return new Response(body as unknown as ReadableStream, {
          headers: {
            "Content-Type": s3ContentType || contentType,
            "Content-Disposition": disposition,
          },
        });
      }

      // Legacy: filesystem path
      let filePath: string;
      if (document.task_id) {
        filePath = path.join(process.cwd(), 'public', 'uploads', document.project.project_code, 'tasks', String(document.task_id), document.name);
      } else if (document.wbs_id) {
        filePath = path.join(process.cwd(), 'public', 'uploads', document.project.project_code, 'wbs', String(document.wbs_id), document.name);
      } else {
        filePath = path.join(process.cwd(), 'public', 'uploads', document.project.project_code, 'documents', document.name);
      }

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,
        },
      });
    }

    // Legacy: Download by project_code, task_id, and filename (filesystem only)
    if (!project_code || !task_id || !filename) {
      return NextResponse.json({ error: "Missing parameters. Provide either documentId or project_code, task_id, and filename" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', project_code, 'tasks', task_id, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}