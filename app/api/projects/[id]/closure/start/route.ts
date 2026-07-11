import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ClosureDocumentType } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromHeaders();
        if (!user?.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const projectId = parseInt(id);

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: 'Invalid project ID' },
                { status: 400 }
            );
        }

        // Check if project exists and is completed
        const project = await prisma.project.findUnique({
            where: { project_id: projectId },
            select: { 
                project_id: true, 
                status: true,
                closure_checklists: {
                    select: { id: true }
                }
            }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        if (project.status !== 'completed') {
            return NextResponse.json(
                { error: 'Project must be completed before starting closure process' },
                { status: 400 }
            );
        }

        // Check if closure process has already been started
        if (project.closure_checklists && project.closure_checklists.length > 0) {
            return NextResponse.json(
                { error: 'Closure process has already been started for this project' },
                { status: 400 }
            );
        }

        // Define checklist items to create
        const checklistItems = [
            {
                title: 'Schedule Final Inspection',
                type: 'inspection'
            },
            {
                title: 'Create Punch List',
                type: 'create_punch_list'
            },
            {
                title: 'Resolve Punch List Items',
                type: 'punch_list'
            },
            {
                title: 'Upload Closure Documents',
                type: 'documents'
            },
            {
                title: 'Complete Project Handover',
                type: 'handover'
            },
            {
                title: 'Obtain Closure Approvals',
                type: 'approval'
            },
            {
                title: 'Generate Final Report',
                type: 'manual'
            }
        ];

        // Define document types to create (without actual documents initially)
        const documentTypes = [
            'AS_BUILT_DRAWING' as ClosureDocumentType,
            'CERTIFICATE_OF_COMPLETION' as ClosureDocumentType,
            'PUNCH_LIST_CONFIRMATION' as ClosureDocumentType,
            'HANDOVER_RECEIPT' as ClosureDocumentType,
            'FINAL_CLOSURE_REPORT' as ClosureDocumentType
        ];

        // Start transaction to create all items
        const result = await prisma.$transaction(async (tx) => {
            // Create checklist items
            const createdChecklistItems = await Promise.all(
                checklistItems.map(item =>
                    tx.closureChecklistItem.create({
                        data: {
                            project_id: projectId,
                            title: item.title,
                            type: item.type,
                            status: 'pending'
                        }
                    })
                )
            );

            // Create closure document items without actual documents
            const createdDocumentItems = await Promise.all(
                documentTypes.map(async (docType) => {
                    return tx.closureDocumentItem.create({
                        data: {
                            project_id: projectId,
                            // document_id is omitted - will be null by default
                            type: docType,
                            required: true,
                            submitted: false,
                            approved: false,
                            notes: 'Document not yet uploaded'
                        }
                    });
                })
            );

            return {
                checklistItems: createdChecklistItems,
                documentItems: createdDocumentItems
            };
        });

        return NextResponse.json({
            message: 'Closure process started successfully',
            data: {
                checklistItemsCreated: result.checklistItems.length,
                documentItemsCreated: result.documentItems.length,
                checklistItems: result.checklistItems,
                documentItems: result.documentItems
            }
        });

    } catch (error) {
        console.error('Error starting closure process:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
