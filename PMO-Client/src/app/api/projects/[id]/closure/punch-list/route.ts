import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const body = await request.json();
        const { title, description, assignee_id, priority } = body;

        const punchItem = await prisma.punchListItem.create({
            data: {
                project_id: parseInt(projectId),
                title,
                assigned_to: assignee_id ? parseInt(assignee_id) : null,
                status: 'open',
            },
            include: {
                assignee: {
                    include: {
                        account: true
                    }
                }
            }
        });

        return NextResponse.json(punchItem, { status: 201 });
    } catch (error) {
        console.error("Error creating punch list item:", error);
        return NextResponse.json(
            { error: "Failed to create punch list item" },
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

        const punchItems = await prisma.punchListItem.findMany({
            where: {
                project_id: parseInt(projectId)
            },
            include: {
                assignee: {
                    include: {
                        account: true
                    }
                }
            },
            orderBy: {
                id: 'desc'
            }
        });

        return NextResponse.json(punchItems);
    } catch (error) {
        console.error("Error fetching punch list items:", error);
        return NextResponse.json(
            { error: "Failed to fetch punch list items" },
            { status: 500 }
        );
    }
}
