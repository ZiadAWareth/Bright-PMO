import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// GET a specific checklist
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; checklist_id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);
    const checklistId = parseInt(params.checklist_id);

    // Validate IDs
    if (isNaN(projectId) || isNaN(checklistId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Get the checklist with validation that it belongs to the project
    const checklist = await prisma.projectChecklist.findFirst({
      where: {
        checklist_id: checklistId,
        project_id: projectId,
      },
      include: {
        project: {
          select: {
            name: true,
            project_code: true,
            status: true,
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

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// PUT update a checklist
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; checklist_id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);
    const checklistId = parseInt(params.checklist_id);
    const { userId, role } = await getUserFromHeaders();

    // Validate IDs
    if (isNaN(projectId) || isNaN(checklistId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Get the existing checklist
    const existingChecklist = await prisma.projectChecklist.findFirst({
      where: {
        checklist_id: checklistId,
        project_id: projectId,
      },
    });

    if (!existingChecklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, category, items, status, is_completed, itemUpdates } = body;

    // Create update data object
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    
    // Handle individual item updates
    if (itemUpdates) {
      // Get current items
      const currentItems = existingChecklist.items as any[];
      
      // Update specific items
      const updatedItems = currentItems.map(item => {
        const update = itemUpdates.find((u: any) => u.id === item.id);
        if (update) {
          return { ...item, ...update };
        }
        return item;
      });
      
      updateData.items = updatedItems;
      
      // Check if all required items are completed
      const allRequiredItemsCompleted = updatedItems
        .filter((item: any) => item.required)
        .every((item: any) => item.completed);
      
      // If all required items are completed, mark checklist as completed
      if (allRequiredItemsCompleted && !existingChecklist.is_completed) {
        updateData.is_completed = true;
        updateData.completed_at = new Date();
      }
    } else if (items !== undefined) {
      // If replacing the entire items array
      updateData.items = items;
      
      // Check if all required items are completed
      const allRequiredItemsCompleted = items
        .filter((item: any) => item.required)
        .every((item: any) => item.completed);
      
      // If all required items are completed, mark checklist as completed
      if (allRequiredItemsCompleted && !existingChecklist.is_completed) {
        updateData.is_completed = true;
        updateData.completed_at = new Date();
      }
    }
    
    // Handle status changes
    if (status === "SUBMITTED" && existingChecklist.status === "DRAFT") {
      updateData.status = "SUBMITTED";
      updateData.submitted_by = userId;
      // Generate approval request when a checklist is submitted
      await createApprovalRequest(projectId, checklistId, userId);
    }
    
    // Explicit completion flag (overrides item-based completion)
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      if (is_completed && !existingChecklist.is_completed) {
        updateData.completed_at = new Date();
      }
    }

    // Update the checklist
    const updatedChecklist = await prisma.projectChecklist.update({
      where: {
        checklist_id: checklistId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedChecklist);
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

// DELETE a checklist
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; checklist_id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);
    const checklistId = parseInt(params.checklist_id);
    const { userId, role } = await getUserFromHeaders();

    // Check if user has permission to delete checklists
    if (role !== "PMO") {
      return NextResponse.json(
        { error: "Unauthorized to delete checklists" },
        { status: 401 }
      );
    }

    // Validate IDs
    if (isNaN(projectId) || isNaN(checklistId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Check if the checklist exists and belongs to the project
    const checklist = await prisma.projectChecklist.findFirst({
      where: {
        checklist_id: checklistId,
        project_id: projectId,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // Delete the checklist
    await prisma.projectChecklist.delete({
      where: {
        checklist_id: checklistId,
      },
    });

    return NextResponse.json(
      { message: "Checklist deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}

// Helper function to create an approval request
async function createApprovalRequest(projectId: number, checklistId: number, requesterId: number) {
  try {
    // Find a PMO user to request approval from
    const pmoUser = await prisma.user.findFirst({
      where: {
        role: {
          name: "PMO"
        }
      },
      select: {
        user_id: true,
      },
    });

    if (!pmoUser) {
      console.error("No PMO user found for checklist approval");
      return;
    }

    // Create approval request
    await prisma.approval.create({
      data: {
        type: "PROJECT_CLOSURE",
        status: "PENDING",
        project_id: projectId,
        checklist_id: checklistId,
        requested_by: requesterId,
        target_user_id: pmoUser.user_id,
        comments: `Approval requested for project closure checklist #${checklistId}`,
      },
    });

    console.log(`Approval request created for checklist ${checklistId}`);
  } catch (error) {
    console.error("Error creating approval request:", error);
  }
} 