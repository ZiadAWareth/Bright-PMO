import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const body = await request.json();
        const { scheduled_date, scheduled_time, inspector_id } = body;

        // Check if inspection already exists for this project
        const existingInspection = await prisma.finalInspection.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (existingInspection) {
            return NextResponse.json(
                { error: "Final inspection already scheduled for this project" },
                { status: 400 }
            );
        }

        const inspection = await prisma.finalInspection.create({
            data: {
                project_id: parseInt(projectId),
                scheduled_date: new Date(scheduled_date),
                scheduled_time,
                inspector_id: inspector_id ? parseInt(inspector_id) : null,
                status: 'scheduled'
            },
            include: {
                inspector: {
                    include: {
                        account: true
                    }
                }
            }
        });

        return NextResponse.json(inspection, { status: 201 });
    } catch (error) {
        console.error("Error scheduling final inspection:", error);
        return NextResponse.json(
            { error: "Failed to schedule final inspection" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        const inspection = await prisma.finalInspection.findUnique({
            where: {
                project_id: parseInt(projectId)
            },
            include: {
                inspector: {
                    include: {
                        account: true
                    }
                },
                submitter: {
                    include: {
                        account: true
                    }
                },
                approver: {
                    include: {
                        account: true
                    }
                }
            }
        });

        return NextResponse.json(inspection);
    } catch (error) {
        console.error("Error fetching final inspection:", error);
        return NextResponse.json(
            { error: "Failed to fetch final inspection" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        let authUserId: number;
        try {
            const auth = await getUserFromHeaders();
            authUserId = auth.userId;
        } catch {
            return NextResponse.json(
                { error: "Unauthorized - user context required" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            scheduled_date,
            scheduled_time,
            inspector_id,
            status,
            notes,
            documents,
            approved,
            approval_notes
        } = body;

        const updateData: any = {};

        if (scheduled_date) updateData.scheduled_date = new Date(scheduled_date);
        if (scheduled_time) updateData.scheduled_time = scheduled_time;
        if (inspector_id !== undefined) updateData.inspector_id = inspector_id ? parseInt(inspector_id) : null;
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (documents !== undefined) updateData.documents = documents;

        // submitted_by / approved_by: always use authenticated PMO user_id (never client-sent idp_user_id)
        if (status === "completed") {
            updateData.submitted_by = authUserId;
            updateData.submitted_at = new Date();
        }
        if (approved === true || approved === false) {
            updateData.approved = approved === true;
            if (approval_notes !== undefined) updateData.approval_notes = approval_notes;
            updateData.approved_by = authUserId;
            updateData.approved_at = new Date();
        }

        const inspection = await prisma.finalInspection.update({
            where: {
                project_id: parseInt(projectId)
            },
            data: updateData,
            include: {
                inspector: {
                    include: {
                        account: true
                    }
                },
                submitter: {
                    include: {
                        account: true
                    }
                },
                approver: {
                    include: {
                        account: true
                    }
                }
            }
        });

        // If inspection is being completed, mark the inspection checklist item as complete
        if (status === "completed") {
            try {
                const inspectionChecklistItem = await prisma.closureChecklistItem.findFirst({
                    where: {
                        project_id: parseInt(projectId),
                        type: "inspection",
                        status: "pending"
                    }
                });

                if (inspectionChecklistItem) {
                    await prisma.closureChecklistItem.update({
                        where: { id: inspectionChecklistItem.id },
                        data: {
                            status: "complete",
                            completed_at: new Date(),
                            completed_by: authUserId
                        }
                    });
                }
            } catch (checklistError) {
                console.error("Error updating inspection checklist item:", checklistError);
            }
        }

        return NextResponse.json(inspection);
    } catch (error) {
        console.error("Error updating final inspection:", error);
        return NextResponse.json(
            { error: "Failed to update final inspection" },
            { status: 500 }
        );
    }
}
