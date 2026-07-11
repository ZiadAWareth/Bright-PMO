import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Mark report generation as complete after PDF download
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { project_id: parseInt(projectId) },
            include: {
                closure_checklists: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Mark the "Generate Final Report" checklist item as complete
        await prisma.closureChecklistItem.updateMany({
            where: {
                project_id: parseInt(projectId),
                title: 'Generate Final Report'
            },
            data: {
                status: 'complete',
                completed_at: new Date(),
                completed_by: userId
            }
        });

        // Check if all checklist items are now complete
        const allChecklistItems = await prisma.closureChecklistItem.findMany({
            where: {
                project_id: parseInt(projectId)
            }
        });

        const allCompleted = allChecklistItems.every(item => item.status === 'complete');

        // If all checklist items are complete and project is closure-approved, set status to 'closed'
        let finalProject = project;
        if (allCompleted && project.closure_approved_at) {
            finalProject = await prisma.project.update({
                where: { project_id: parseInt(projectId) },
                data: {
                    status: 'closed'
                },
                include: {
                    closure_checklists: true,
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
        }

        return NextResponse.json({ 
            success: true, 
            project: finalProject,
            allChecklistsComplete: allCompleted,
            projectClosed: allCompleted && project.closure_approved_at
        });
    } catch (error) {
        console.error("Error completing report checklist:", error);
        return NextResponse.json(
            { error: "Failed to complete report checklist" },
            { status: 500 }
        );
    }
}
