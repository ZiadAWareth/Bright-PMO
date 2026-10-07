import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();

        // Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Check if handover exists
        const handover = await prisma.handover.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (!handover) {
            return NextResponse.json({ error: "Handover not found" }, { status: 404 });
        }

        // Use the existing documents API to upload the file
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('project_id', projectId);
        uploadFormData.append('uploaded_by', userId.toString());
        uploadFormData.append('description', 'Handover Receipt');
        uploadFormData.append('category', 'closure');

        // Call the documents upload API internally
        const uploadResponse = await fetch(`http://localhost:3000/api/documents/uploadFile`, {
            method: 'POST',
            body: uploadFormData,
            headers: {
                'Authorization': request.headers.get('Authorization') || '',
            }
        });

        if (!uploadResponse.ok) {
            const responseText = await uploadResponse.text();
            console.error('Upload API response:', responseText);
            
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                return NextResponse.json(
                    { error: `Upload failed: ${responseText || 'Unknown error'}` },
                    { status: uploadResponse.status }
                );
            }
            
            return NextResponse.json(
                { error: errorData.error || "Failed to upload document" },
                { status: uploadResponse.status }
            );
        }

        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult.success || !uploadResult.document) {
            return NextResponse.json(
                { error: "Document upload failed" },
                { status: 500 }
            );
        }

        // Update the handover to link to the uploaded receipt
        const updatedHandover = await prisma.handover.update({
            where: { project_id: parseInt(projectId) },
            data: {
                handover_receipt_id: uploadResult.document.document_id
            },
            include: {
                handover_user: {
                    select: {
                        user_id: true,
                        username: true,
                        account: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                handover_receipt: {
                    select: {
                        document_id: true,
                        name: true,
                        file_path: true,
                        file_type: true,
                        size: true
                    }
                }
            }
        });

        return NextResponse.json({
            ...updatedHandover,
            receiptUploaded: true
        });
    } catch (error) {
        console.error("Error uploading handover receipt:", error);
        return NextResponse.json(
            { error: "Failed to upload handover receipt" },
            { status: 500 }
        );
    }
}
