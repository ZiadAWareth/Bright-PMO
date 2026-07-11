import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
    try {
        const { id: projectId, checklistId } = await params;
        const { userId } = await getUserFromHeaders();
        const body = await request.json();
        const { status } = body;

        const checklistItem = await prisma.closureChecklistItem.update({
            where: { 
                id: parseInt(checklistId),
                project_id: parseInt(projectId)
            },
            data: {
                status: status === 'complete' ? 'complete' : 'pending',
                completed_at: status === 'complete' ? new Date() : null,
                completed_by: status === 'complete' ? userId : null
            },
            include: {
                completedBy: {
                    include: {
                        account: true
                    }
                }
            }
        });

        return NextResponse.json(checklistItem);
    } catch (error) {
        console.error("Error updating checklist item:", error);
        return NextResponse.json(
            { error: "Failed to update checklist item" },
            { status: 500 }
        );
    }
}
