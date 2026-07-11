import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Approve or reject handover
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();
        
        const body = await request.json();
        const { approved, approval_notes } = body;

        // Find existing handover
        const existingHandover = await prisma.handover.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (!existingHandover) {
            return NextResponse.json({ error: "Handover not found" }, { status: 404 });
        }

        if (!existingHandover.submitted_at) {
            return NextResponse.json(
                { error: "Handover must be completed before it can be approved" },
                { status: 400 }
            );
        }

        // Update the handover with approval status
        const updatedHandover = await prisma.handover.update({
            where: { project_id: parseInt(projectId) },
            data: {
                approved_at: approved ? new Date() : null,
                approved_by: approved ? userId : null,
                // Store approval notes in the notes field or create a separate field
                notes: approval_notes ? 
                    (existingHandover.notes ? `${existingHandover.notes}\n\nApproval Notes: ${approval_notes}` : `Approval Notes: ${approval_notes}`) 
                    : existingHandover.notes
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
                },
                submitter: {
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
                approver: {
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
                }
            }
        });

        // If approved, check if we should auto-complete the handover checklist item
        if (approved) {
            const handoverChecklistItem = await prisma.closureChecklistItem.findFirst({
                where: {
                    project_id: parseInt(projectId),
                    type: 'handover'
                }
            });

            if (handoverChecklistItem && handoverChecklistItem.status !== 'complete') {
                await prisma.closureChecklistItem.update({
                    where: {
                        id: handoverChecklistItem.id
                    },
                    data: {
                        status: 'complete',
                        completed_at: new Date(),
                        completed_by: userId,
                        auto_checked: true
                    }
                });
            }
        }

        return NextResponse.json(updatedHandover);
    } catch (error) {
        console.error("Error approving handover:", error);
        return NextResponse.json(
            { error: "Failed to approve handover" },
            { status: 500 }
        );
    }
}
