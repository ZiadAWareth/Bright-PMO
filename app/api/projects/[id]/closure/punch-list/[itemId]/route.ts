import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { id: projectId, itemId } = await params;
        const body = await request.json();
        const { status, title, assignee_id } = body;

        const updateData: any = {};
        
        if (status !== undefined) {
            updateData.status = status;
            updateData.resolved_at = status === 'resolved' ? new Date() : null;
        }
        
        if (title !== undefined) {
            updateData.title = title;
        }
        
        if (assignee_id !== undefined) {
            updateData.assigned_to = assignee_id ? parseInt(assignee_id) : null;
        }

        const punchItem = await prisma.punchListItem.update({
            where: { 
                id: parseInt(itemId),
                project_id: parseInt(projectId)
            },
            data: updateData,
            include: {
                assignee: {
                    include: {
                        account: true
                    }
                }
            }
        });

        // If this item was just resolved, check if all punch list items are now resolved
        // and automatically mark the punch list checklist item as complete
        if (status === 'resolved') {
            try {
                // Get all punch list items for this project
                const allPunchItems = await prisma.punchListItem.findMany({
                    where: {
                        project_id: parseInt(projectId)
                    }
                });

                // Check if all punch list items are resolved
                const allResolved = allPunchItems.every(item => item.status === 'resolved');

                if (allResolved && allPunchItems.length > 0) {
                    // Find the punch list checklist item
                    const punchListChecklistItem = await prisma.closureChecklistItem.findFirst({
                        where: {
                            project_id: parseInt(projectId),
                            type: 'punch_list',
                            status: 'pending'
                        }
                    });

                    if (punchListChecklistItem) {
                        await prisma.closureChecklistItem.update({
                            where: {
                                id: punchListChecklistItem.id
                            },
                            data: {
                                status: 'complete',
                                completed_at: new Date(),
                                // You might want to get the current user ID from the request headers
                                // completed_by: currentUserId
                            }
                        });
                    }
                }
            } catch (checklistError) {
                console.error("Error updating punch list checklist item:", checklistError);
                // Don't fail the punch item update if checklist update fails
            }
        }

        return NextResponse.json(punchItem);
    } catch (error) {
        console.error("Error updating punch list item:", error);
        return NextResponse.json(
            { error: "Failed to update punch list item" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { id: projectId, itemId } = await params;

        await prisma.punchListItem.delete({
            where: { 
                id: parseInt(itemId),
                project_id: parseInt(projectId)
            }
        });

        return NextResponse.json({ message: "Punch list item deleted successfully" });
    } catch (error) {
        console.error("Error deleting punch list item:", error);
        return NextResponse.json(
            { error: "Failed to delete punch list item" },
            { status: 500 }
        );
    }
}
