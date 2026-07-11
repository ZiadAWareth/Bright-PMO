import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; documentId: string }> }
) {
    try {
        const { id: projectId, documentId } = await params;
        const { userId } = await getUserFromHeaders();

        // Document.uploaded_by references Account.account_id, not User.user_id
        const account = await prisma.account.findUnique({
            where: { user_id: userId },
        });
        if (!account) {
            return NextResponse.json(
                { error: "User account not found. Cannot record document upload." },
                { status: 400 }
            );
        }

        // Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const documentItemId = formData.get('document_item_id') as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Get the closure document item to understand the context
        const closureDocItem = await prisma.closureDocumentItem.findUnique({
            where: { 
                id: parseInt(documentItemId),
                project_id: parseInt(projectId)
            }
        });

        if (!closureDocItem) {
            return NextResponse.json({ error: "Closure document item not found" }, { status: 404 });
        }


        const path = await import('path');

        // Get project code for path
        const project = await prisma.project.findUnique({
            where: { project_id: parseInt(projectId) }
        });
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Handle file versioning
        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext);
        const existingDoc = await prisma.document.findFirst({
            where: {
                project_id: parseInt(projectId),
                name: { startsWith: baseName },
            },
            orderBy: { version: 'desc' },
        });
        const version = existingDoc ? existingDoc.version + 1 : 1;
        const versionedFileName = `${baseName}_v${version}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        let file_path: string;
        const { isS3Configured, uploadBuffer } = await import('@/lib/s3-upload');
        if (isS3Configured()) {
            const key = `uploads/${project.project_code}/closure/${versionedFileName}`;
            await uploadBuffer(key, buffer, file.type);
            file_path = key;
        } else {
            const fs = await import('fs');
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', project.project_code, 'closure');
            fs.mkdirSync(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, versionedFileName);
            fs.writeFileSync(filePath, buffer);
            file_path = `/uploads/${project.project_code}/closure/${versionedFileName}`;
        }

        // Create document record
        const documentTitleMap: Record<string, string> = {
            'AS_BUILT_DRAWING': 'As-Built Drawing',
            'CERTIFICATE_OF_COMPLETION': 'Certificate of Completion',
            'PUNCH_LIST_CONFIRMATION': 'Punch List Confirmation',
            'HANDOVER_RECEIPT': 'Handover Receipt',
            'FINAL_CLOSURE_REPORT': 'Final Closure Report'
        };
        const documentTitle = documentTitleMap[closureDocItem.type] || closureDocItem.type.replace(/_/g, ' ');

        const documentData = {
            name: versionedFileName,
            description: documentTitle,
            file_path,
            file_type: file.type,
            size: file.size,
            uploaded_by: account.account_id,
            project_id: parseInt(projectId),
            version,
        };

        const createdDocument = await prisma.document.create({
            data: documentData
        });

        // Update the closure document item to link to the uploaded document
        const updatedDocumentItem = await prisma.closureDocumentItem.update({
            where: { 
                id: parseInt(documentItemId),
                project_id: parseInt(projectId)
            },
            data: {
                document_id: createdDocument.document_id,
                submitted: true,
                approved: true, // Auto-approve on upload
            },
            include: {
                document: true
            }
        });

        // Check if all required documents are now uploaded
        const allDocumentItems = await prisma.closureDocumentItem.findMany({
            where: {
                project_id: parseInt(projectId)
            }
        });

        // Check if all required documents have been uploaded
        const allRequiredDocumentsUploaded = allDocumentItems
            .filter(item => item.required)
            .every(item => item.document_id !== null);

        // If all required documents are uploaded, mark the documents checklist item as complete
        if (allRequiredDocumentsUploaded) {
            const documentsChecklistItem = await prisma.closureChecklistItem.findFirst({
                where: {
                    project_id: parseInt(projectId),
                    type: 'documents'
                }
            });

            if (documentsChecklistItem && documentsChecklistItem.status !== 'complete') {
                await prisma.closureChecklistItem.update({
                    where: {
                        id: documentsChecklistItem.id
                    },
                    data: {
                        status: 'complete',
                        completed_at: new Date(),
                        completed_by: userId
                    }
                });
            }
        }

        return NextResponse.json({
            ...updatedDocumentItem,
            checklistCompleted: allRequiredDocumentsUploaded // Add this flag to inform frontend
        });
    } catch (error) {
        console.error("Error uploading closure document:", error);
        return NextResponse.json(
            { error: "Failed to upload closure document" },
            { status: 500 }
        );
    }
}
