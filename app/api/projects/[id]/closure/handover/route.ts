import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Schedule a new handover
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();
        
        const body = await request.json();
        const { handover_date, handover_time, handed_over_by, handed_over_to, notes } = body;

        // Validate required fields
        if (!handover_date || !handover_time || !handed_over_by) {
            return NextResponse.json(
                { error: "Missing required fields: handover_date, handover_time, handed_over_by" },
                { status: 400 }
            );
        }

        // Check if project exists and is completed
        const project = await prisma.project.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.status !== 'completed') {
            return NextResponse.json(
                { error: "Handover can only be scheduled for completed projects" },
                { status: 400 }
            );
        }

        // Check if handover already exists
        const existingHandover = await prisma.handover.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (existingHandover) {
            return NextResponse.json(
                { error: "Handover already exists for this project" },
                { status: 400 }
            );
        }

        // Create the handover
        const handover = await prisma.handover.create({
            data: {
                project_id: parseInt(projectId),
                handover_date: new Date(handover_date),
                handover_time,
                handed_over_by: parseInt(handed_over_by),
                handed_over_to,
                notes,
                status: "scheduled"
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

        return NextResponse.json(handover, { status: 201 });
    } catch (error) {
        console.error("Error scheduling handover:", error);
        return NextResponse.json(
            { error: "Failed to schedule handover" },
            { status: 500 }
        );
    }
}

// Update handover (complete handover, upload receipt, etc.)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();
        
        const body = await request.json();
        const { status, notes, handed_over_to, handover_receipt_id } = body;

        // Find existing handover
        const existingHandover = await prisma.handover.findUnique({
            where: { project_id: parseInt(projectId) }
        });

        if (!existingHandover) {
            return NextResponse.json({ error: "Handover not found" }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {};
        
        if (status !== undefined) {
            updateData.status = status;
            
            // If completing the handover, set completion timestamps
            if (status === 'completed') {
                updateData.submitted_at = new Date();
                updateData.submitted_by = userId;
                updateData.approved_at = new Date();
                updateData.approved_by = userId;
            }
        }
        
        if (notes !== undefined) updateData.notes = notes;
        if (handed_over_to !== undefined) updateData.handed_over_to = handed_over_to;
        if (handover_receipt_id !== undefined) updateData.handover_receipt_id = handover_receipt_id;

        // Update the handover
        const updatedHandover = await prisma.handover.update({
            where: { project_id: parseInt(projectId) },
            data: updateData,
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

        // If handover is completed, check if we should auto-complete the handover checklist item
        if (status === 'completed') {
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
                        completed_by: userId
                    }
                });
            }
        }

        return NextResponse.json(updatedHandover);
    } catch (error) {
        console.error("Error updating handover:", error);
        return NextResponse.json(
            { error: "Failed to update handover" },
            { status: 500 }
        );
    }
}

// Get handover details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        const handover = await prisma.handover.findUnique({
            where: { project_id: parseInt(projectId) },
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

        if (!handover) {
            return NextResponse.json({ error: "Handover not found" }, { status: 404 });
        }

        return NextResponse.json(handover);
    } catch (error) {
        console.error("Error fetching handover:", error);
        return NextResponse.json(
            { error: "Failed to fetch handover" },
            { status: 500 }
        );
    }
}
