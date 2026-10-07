import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



/**
 * @swagger
 * /api/resourceAssignments/{assignment_id}:
 *   get:
 *     summary: Get a resource assignment by ID
 *     description: Retrieves a specific resource assignment by its ID with resource and task details
 *     tags:
 *       - Resource Assignments
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         description: ID of the resource assignment to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resource assignment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignment_id:
 *                   type: integer
 *                 resource_id:
 *                   type: integer
 *                 task_id:
 *                   type: integer
 *                 allocation_percentage:
 *                   type: number
 *                   format: float
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 end_date:
 *                   type: string
 *                   format: date
 *                 planned_hours:
 *                   type: number
 *                   format: float
 *                 actual_hours:
 *                   type: number
 *                   format: float
 *                 resource:
 *                   type: object
 *                 task:
 *                   type: object
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ assignment_id: string }> }
) {
  const resolvedParams = await context.params;
  const { assignment_id } = resolvedParams;
  try {
    const assignment = await prisma.resourceAssignment.findUnique({
      where: { assignment_id: Number(assignment_id) },
      include: {
        resource: true,
        task: true,
      },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/resourceAssignments/{assignment_id}:
 *   put:
 *     summary: Update a resource assignment
 *     description: Updates an existing resource assignment by ID
 *     tags:
 *       - Resource Assignments
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         description: ID of the resource assignment to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resource_id:
 *                 type: integer
 *                 description: ID of the resource to assign
 *               task_id:
 *                 type: integer
 *                 description: ID of the task to assign the resource to
 *               allocation_percentage:
 *                 type: number
 *                 format: float
 *                 description: Percentage of resource allocation (0-100)
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the assignment
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: End date of the assignment
 *               planned_hours:
 *                 type: number
 *                 format: float
 *                 description: Planned hours for the assignment
 *               actual_hours:
 *                 type: number
 *                 format: float
 *                 description: Actual hours worked
 *     responses:
 *       200:
 *         description: Resource assignment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignment_id:
 *                   type: integer
 *                 resource_id:
 *                   type: integer
 *                 task_id:
 *                   type: integer
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ assignment_id: string }> }
) {
  const resolvedParams = await context.params;
  const { assignment_id } = resolvedParams;
  try {
    const data = await req.json();
    
    // Get the existing assignment to ensure we have the task_id
    const existingAssignment = await prisma.resourceAssignment.findUnique({
      where: { assignment_id: Number(assignment_id) },
      include: { task: true }
    });
    
    if (!existingAssignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    // Use existing task_id if not provided in the update data
    const taskId = data.task_id || existingAssignment.task_id;
    
    // Validate that assignment dates are within task dates
    if (taskId && (data.start_date || data.end_date)) {
      const task = await prisma.task.findUnique({
        where: { task_id: taskId }
      });
      
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      
      if (data.start_date) {
        const assignmentStartDate = new Date(data.start_date);
        const taskStartDate = new Date(task.start_date);
        
        if (assignmentStartDate < taskStartDate) {
          return NextResponse.json({ 
            error: "Assignment start date cannot be before task start date", 
            details: {
              assignment_start_date: assignmentStartDate,
              task_start_date: taskStartDate
            }
          }, { status: 400 });
        }
      }
      
      if (data.end_date) {
        const assignmentEndDate = new Date(data.end_date);
        const taskEndDate = new Date(task.end_date);
        
        if (assignmentEndDate > taskEndDate) {
          return NextResponse.json({ 
            error: "Assignment end date cannot be after task end date", 
            details: {
              assignment_end_date: assignmentEndDate,
              task_end_date: taskEndDate
            }
          }, { status: 400 });
        }
      }
    }
    
    // Check if all resource assignments for this task are completed
    if (data.actual_hours !== undefined && data.planned_hours !== undefined && 
        (data.actual_hours === data.planned_hours || data.actual_hours > data.planned_hours)) {
      
      await prisma.$transaction(async (tx) => {
        // Get all resource assignments for this task
        const allAssignments = await tx.resourceAssignment.findMany({
          where: { task_id: taskId }
        });
        
        // Check if ALL assignments are completed (actual >= planned)
        const allAssignmentsComplete = allAssignments.every(assignment => {
          // For the current assignment being updated, use the new values
          if (assignment.assignment_id === Number(assignment_id)) {
            return data.actual_hours >= data.planned_hours;
          }
          // For other assignments, check existing values
          return assignment.actual_hours >= assignment.planned_hours;
        });
        
        // Only update task status to completed if ALL resource assignments are done
        if (allAssignmentsComplete) {
          await tx.task.update({
            where: { task_id: taskId },
            data: { status: "completed",
              progress_percentage: 100,
             },
          });
        }
      });
    }

    // Build update data object, only including defined fields
    const updateData: any = {};
    
    if (data.resource_id !== undefined) updateData.resource_id = data.resource_id;
    if (data.task_id !== undefined) updateData.task_id = data.task_id;
    if (data.allocation_percentage !== undefined) updateData.allocation_percentage = data.allocation_percentage;
    if (data.start_date !== undefined) updateData.start_date = new Date(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = new Date(data.end_date);
    if (data.planned_hours !== undefined) updateData.planned_hours = data.planned_hours;
    if (data.actual_hours !== undefined) updateData.actual_hours = data.actual_hours;

    const updated = await prisma.resourceAssignment.update({
      where: { assignment_id: Number(assignment_id) },
      data: updateData,
      include: {
        resource: true,
        task: true,
      },
    });

    // Update task progress based on resource assignments
    const resourceAssignments = await prisma.resourceAssignment.findMany({
        where: { task_id: taskId },
        select: {
            progress: true,
            planned_hours: true
        }
    });

    let taskProgress = 0;
    if (resourceAssignments.length > 0) {
        const totalPlannedHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.planned_hours, 0);
        
        if (totalPlannedHours > 0) {
            const weightedProgress = resourceAssignments.reduce((sum, assignment) => {
                const weight = assignment.planned_hours / totalPlannedHours;
                return sum + (assignment.progress * weight);
            }, 0);
            taskProgress = Math.round(weightedProgress);
        }
    }

    // Prepare task update data
    const taskUpdateData: any = { progress_percentage: taskProgress };
    
    // Auto-complete task when it reaches 100%
    if (taskProgress >= 100) {
        taskUpdateData.status = 'completed';
        taskUpdateData.actual_end_date = new Date();
    }

    await prisma.task.update({
        where: { task_id: taskId },
        data: taskUpdateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/resourceAssignments/{assignment_id}:
 *   delete:
 *     summary: Delete a resource assignment
 *     description: Deletes a resource assignment by ID
 *     tags:
 *       - Resource Assignments
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         description: ID of the resource assignment to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resource assignment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resource assignment deleted successfully
 *                 deletedAssignment:
 *                   type: object
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ assignment_id: string }> }
) {
  const resolvedParams = await context.params;
  const { assignment_id } = resolvedParams;
  try {
    // Get the assignment details before deleting to access task_id
    const assignmentToDelete = await prisma.resourceAssignment.findUnique({
      where: { assignment_id: Number(assignment_id) },
      select: { task_id: true }
    });

    if (!assignmentToDelete) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // First delete associated field data records
      await tx.fieldData.deleteMany({
        where: { resource_assignment_id: Number(assignment_id) },
      });

      // Then delete the resource assignment
      return await tx.resourceAssignment.delete({
        where: { assignment_id: Number(assignment_id) },
      });
    });

    // Update task progress based on remaining resource assignments
    const resourceAssignments = await prisma.resourceAssignment.findMany({
        where: { task_id: assignmentToDelete.task_id },
        select: {
            progress: true,
            planned_hours: true
        }
    });

    let taskProgress = 0;
    if (resourceAssignments.length > 0) {
        const totalPlannedHours = resourceAssignments.reduce((sum, assignment) => sum + assignment.planned_hours, 0);
        
        if (totalPlannedHours > 0) {
            const weightedProgress = resourceAssignments.reduce((sum, assignment) => {
                const weight = assignment.planned_hours / totalPlannedHours;
                return sum + (assignment.progress * weight);
            }, 0);
            taskProgress = Math.round(weightedProgress);
        }
    }

    // Prepare task update data
    const taskUpdateData: any = { progress_percentage: taskProgress };
    
    // Auto-complete task when it reaches 100% (should be rare for deletions, but possible)
    if (taskProgress >= 100) {
        taskUpdateData.status = 'completed';
        taskUpdateData.actual_end_date = new Date();
    }

    await prisma.task.update({
        where: { task_id: assignmentToDelete.task_id },
        data: taskUpdateData
    });

    return NextResponse.json({ message: "Resource assignment deleted successfully", deleted });
  } catch (error) {
    console.error("Error deleting resource assignment:", error);
    return NextResponse.json({ error: "Failed to delete resource assignment" }, { status: 500 });
  }
}
