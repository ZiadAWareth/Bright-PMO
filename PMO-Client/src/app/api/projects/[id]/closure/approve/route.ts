import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Approve project closure (final closure approval)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();
        
        const body = await request.json();
        const { approved, approval_notes } = body;

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { project_id: parseInt(projectId) },
            include: {
                final_inspection: true,
                handover: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Verify prerequisites are met
        if (!project.final_inspection?.approved_at) {
            return NextResponse.json(
                { error: "Final inspection must be approved before project closure" },
                { status: 400 }
            );
        }

        if (!project.handover?.approved_at) {
            return NextResponse.json(
                { error: "Handover must be approved before project closure" },
                { status: 400 }
            );
        }

        // Update the project with closure approval
        // Don't set status to 'closed' yet - only when all checklist items including reports are complete
        const updatedProject = await prisma.project.update({
            where: { project_id: parseInt(projectId) },
            data: {
                closure_approved_at: approved ? new Date() : null,
                closure_approved_by: approved ? userId : null,
                closure_notes: approval_notes
                // Keep status as 'completed' until all checklist items including reports are done
            },
            include: {
                closure_approved_user: {
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

        // If approved, mark only the approval checklist item as complete
        if (approved) {
            await prisma.closureChecklistItem.updateMany({
                where: {
                    project_id: parseInt(projectId),
                    status: 'pending',
                    type: 'approval' // Only complete the approval checklist item
                },
                data: {
                    status: 'complete',
                    completed_at: new Date(),
                    completed_by: userId,
                    auto_checked: true
                }
            });
        }

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error("Error approving project closure:", error);
        return NextResponse.json(
            { error: "Failed to approve project closure" },
            { status: 500 }
        );
    }
}
