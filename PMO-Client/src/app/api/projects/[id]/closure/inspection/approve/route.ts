import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Approve or reject final inspection
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();
        
        const body = await request.json();
        const { approved, approval_notes } = body;

        // Find existing inspection
        const existingInspection = await prisma.finalInspection.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (!existingInspection) {
            return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
        }

        if (!existingInspection.submitted_at) {
            return NextResponse.json(
                { error: "Inspection must be submitted before it can be approved" },
                { status: 400 }
            );
        }

        // Update the inspection with approval status
        const updatedInspection = await prisma.finalInspection.update({
            where: { project_id: parseInt(projectId) },
            data: {
                approved: approved,
                approval_notes: approval_notes,
                approved_at: approved ? new Date() : null,
                approved_by: approved ? userId : null
            },
            include: {
                inspector: {
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

        // If approved, check if we should auto-complete the inspection checklist item
        if (approved) {
            const inspectionChecklistItem = await prisma.closureChecklistItem.findFirst({
                where: {
                    project_id: parseInt(projectId),
                    type: 'inspection'
                }
            });

            if (inspectionChecklistItem && inspectionChecklistItem.status !== 'complete') {
                await prisma.closureChecklistItem.update({
                    where: {
                        id: inspectionChecklistItem.id
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

        return NextResponse.json(updatedInspection);
    } catch (error) {
        console.error("Error approving inspection:", error);
        return NextResponse.json(
            { error: "Failed to approve inspection" },
            { status: 500 }
        );
    }
}
