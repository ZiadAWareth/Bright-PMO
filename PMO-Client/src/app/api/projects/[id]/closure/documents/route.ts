import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { ClosureDocumentType } from "@prisma/client";

/**
 * @swagger
 * /api/projects/{id}/closure/documents:
 *   get:
 *     summary: Get all closure documents for a project
 *     description: Retrieves all closure document items with their linked documents for a project
 *     tags:
 *       - Project Closure
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve closure documents for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Closure documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   required:
 *                     type: boolean
 *                   submitted:
 *                     type: boolean
 *                   approved:
 *                     type: boolean
 *                   notes:
 *                     type: string
 *                   document:
 *                     type: object
 *       404:
 *         description: Project not found
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

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const closureDocuments = await prisma.closureDocumentItem.findMany({
      where: { project_id: projectId },
      include: {
        document: true
      },
      orderBy: {
        type: 'asc'
      }
    });

    return NextResponse.json(closureDocuments);
  } catch (error) {
    console.error("Error fetching closure documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch closure documents" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/projects/{id}/closure/documents:
 *   post:
 *     summary: Upload multiple closure documents for a project
 *     description: Uploads multiple files and creates corresponding ClosureDocumentItem entries linked to the uploaded documents
 *     tags:
 *       - Project Closure
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to upload closure documents for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The files to upload
 *     responses:
 *       200:
 *         description: Documents uploaded and linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileName:
 *                         type: string
 *                       documentId:
 *                         type: integer
 *                       closureDocumentItemId:
 *                         type: integer
 *                       status:
 *                         type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileName:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: No files provided
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const projectId = parseInt(id);

    const { userId } = await getUserFromHeaders();

    const account = await prisma.account.findUnique({
      where: { user_id: userId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "User account not found. Cannot record document upload." },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results: Array<{
      fileName: string;
      documentId?: number;
      closureDocumentItemId?: number;
      status: 'success' | 'error';
      error?: string;
    }> = [];

    const path = await import('path');
    const { isS3Configured, uploadBuffer } = await import('@/lib/s3-upload');
    const useS3 = isS3Configured();

    for (const file of files) {
      try {
        const fileName = file.name;
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        // Handle file versioning
        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext);
        const existingDoc = await prisma.document.findFirst({
          where: {
            project_id: projectId,
            name: { startsWith: baseName },
          },
          orderBy: { version: 'desc' },
        });
        const version = existingDoc ? existingDoc.version + 1 : 1;
        const versionedFileName = `${baseName}_v${version}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        let file_path: string;
        if (useS3) {
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
        const documentData = {
          name: versionedFileName,
          description: `Closure document: ${fileNameWithoutExt}`,
          file_path,
          file_type: file.type,
          size: file.size,
          uploaded_by: account.account_id,
          project_id: projectId,
          version,
          // Optionally add wbs_id, task_id, parent_document_id if needed
        };
        const createdDocument = await prisma.document.create({
          data: documentData
        });
        // Create or update ClosureDocumentItem based on matching document name with type
        const allExistingItems = await prisma.closureDocumentItem.findMany({
          where: {
            project_id: projectId
          }
        });
        const closureDocType = determineClosureDocumentType(fileNameWithoutExt);
        let existingItem = allExistingItems.find(item => item.type === closureDocType);
        if (!existingItem) {
          const documentDisplayName = getDocumentTypeDisplayName(closureDocType).toLowerCase();
          const fileNameLower = fileNameWithoutExt.toLowerCase();
          existingItem = allExistingItems.find(item => {
            const itemDisplayName = getDocumentTypeDisplayName(item.type).toLowerCase();
            return fileNameLower.includes(itemDisplayName.replace(/[_\-\s]/g, '')) ||
                   itemDisplayName.includes(fileNameLower.replace(/[_\-\s]/g, ''));
          });
          if (existingItem) {
            console.log(`Matched document "${fileName}" with existing closure item type: ${existingItem.type}`);
          }
        }
        let closureDocumentItem = null;
        if (existingItem) {
          closureDocumentItem = await prisma.closureDocumentItem.update({
            where: { id: existingItem.id },
            data: {
              document_id: createdDocument.document_id,
              submitted: true,
              approved: true, // Auto-approve on upload
              notes: `Filename: ${fileName} - Updated with document upload`
            }
          });
          console.log(`Updated existing closure document item (ID: ${existingItem.id}) with document: ${fileName}`);
        }
        if(closureDocumentItem === null) {
          results.push({
            fileName,
            status: 'error',
            error: 'Failed to update closure document item'
          });
          continue;
        }
        results.push({
          fileName,
          documentId: createdDocument.document_id,
          closureDocumentItemId: closureDocumentItem.id,
          status: 'success'
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          fileName: file.name,
          status: 'error',
          error: `Processing failed: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: errorCount === 0,
      message: `Successfully processed ${successCount} files${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results: results.filter(r => r.status === 'success'),
      errors: results.filter(r => r.status === 'error')
    });

  } catch (error) {
    console.error("Error uploading closure documents:", error);
    return NextResponse.json(
      { error: "Failed to upload closure documents" },
      { status: 500 }
    );
  }
}

/**
 * Determines the closure document type based on filename
 * This function maps document names to specific ClosureDocumentType enum values
 */
function determineClosureDocumentType(fileName: string): ClosureDocumentType {
  const lowerName = fileName.toLowerCase().replace(/[_\-\s]/g, ''); // Remove separators for better matching
  
  // More precise matching based on document names
  if (lowerName.includes('asbuilt') || lowerName.includes('drawing') || lowerName.includes('asbuild')) {
    return ClosureDocumentType.AS_BUILT_DRAWING;
  } else if (lowerName.includes('certificate') && lowerName.includes('completion')) {
    return ClosureDocumentType.CERTIFICATE_OF_COMPLETION;
  } else if (lowerName.includes('punch') && lowerName.includes('list')) {
    return ClosureDocumentType.PUNCH_LIST_CONFIRMATION;
  } else if (lowerName.includes('handover') && lowerName.includes('receipt')) {
    return ClosureDocumentType.HANDOVER_RECEIPT;
  } else if ((lowerName.includes('final') && lowerName.includes('closure')) || 
             (lowerName.includes('final') && lowerName.includes('report')) ||
             lowerName.includes('closurereport')) {
    return ClosureDocumentType.FINAL_CLOSURE_REPORT;
  } else {
    // For more precise matching, we can also check for exact type names
    const typeMapping: Record<string, ClosureDocumentType> = {
      'asbuiltdrawing': ClosureDocumentType.AS_BUILT_DRAWING,
      'certificateofcompletion': ClosureDocumentType.CERTIFICATE_OF_COMPLETION,
      'punchlistconfirmation': ClosureDocumentType.PUNCH_LIST_CONFIRMATION,
      'handoverreceipt': ClosureDocumentType.HANDOVER_RECEIPT,
      'finalclosurereport': ClosureDocumentType.FINAL_CLOSURE_REPORT,
    };
    
    // Check if the filename directly matches any of our type mappings
    for (const [key, type] of Object.entries(typeMapping)) {
      if (lowerName.includes(key)) {
        return type;
      }
    }
    
    // Default to final closure report if we can't determine the type
    return ClosureDocumentType.FINAL_CLOSURE_REPORT;
  }
}

/**
 * Helper function to convert ClosureDocumentType enum to a readable string
 * This helps in matching document names with existing closure document items
 */
function getDocumentTypeDisplayName(type: ClosureDocumentType): string {
  const displayNames: Record<ClosureDocumentType, string> = {
    [ClosureDocumentType.AS_BUILT_DRAWING]: 'As-Built Drawing',
    [ClosureDocumentType.CERTIFICATE_OF_COMPLETION]: 'Certificate of Completion',
    [ClosureDocumentType.PUNCH_LIST_CONFIRMATION]: 'Punch List Confirmation',
    [ClosureDocumentType.HANDOVER_RECEIPT]: 'Handover Receipt',
    [ClosureDocumentType.FINAL_CLOSURE_REPORT]: 'Final Closure Report',
  };
  
  return displayNames[type] || type.replace(/_/g, ' ');
}
