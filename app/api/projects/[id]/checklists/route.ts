import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// GET project checklists
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);
    
    // Validate project ID
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }


    // Get checklists for this project
    const checklists = await prisma.projectChecklist.findMany({
      include: {
        project: {
          select: {
            name: true,
            project_code: true,
          },
        },
        submitter: {
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        approver: {
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error("Error fetching project checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

// POST create a new checklist for this project
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);
    const { userId, role } = await getUserFromHeaders();
    
    // Only project managers can create checklists
    if (role !== "PJM" && role !== "PMO") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate project ID
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, category, items } = body;

    // Validate required fields
    if (!title || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing required fields or invalid items format" },
        { status: 400 }
      );
    }

    // Validate and process items
    if (!items.every((item: any) => item.name)) {
      return NextResponse.json(
        { error: "Each item must have a name" },
        { status: 400 }
      );
    }

    // Ensure each item has required fields
    const processedItems = items.map((item: any) => ({
      name: item.name,
      completed: item.completed !== undefined ? item.completed : false
    }));

    // Create the checklist
    const checklist = await prisma.projectChecklist.create({
      data: {
        project_id: projectId,
        title,
        description,
        category: category || "CUSTOM",
        items: processedItems,
        status: "DRAFT",
        created_by: userId,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist:", error);
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
} 