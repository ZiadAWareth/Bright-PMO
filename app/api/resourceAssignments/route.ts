import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";



/**
 * @swagger
 * /api/resourceAssignments:
 *   get:
 *     summary: Get all resource assignments
 *     description: Retrieves a list of all resource assignments with resource and task details
 *     tags:
 *       - Resource Assignments
 *     responses:
 *       200:
 *         description: List of resource assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   assignment_id:
 *                     type: integer
 *                   resource_id:
 *                     type: integer
 *                   task_id:
 *                     type: integer
 *                   allocation_percentage:
 *                     type: number
 *                     format: float
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                   planned_hours:
 *                     type: number
 *                     format: float
 *                   actual_hours:
 *                     type: number
 *                     format: float
 *                   resource:
 *                     type: object
 *                   task:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {
    const assignments = await prisma.resourceAssignment.findMany({
      include: {  // Add include for consistency with other endpoints
        resource: true,
        task: true,
      }
    });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/resourceAssignments:
 *   post:
 *     summary: Create a new resource assignment
 *     description: Creates a new resource assignment with availability checking and alternative resource suggestions
 *     tags:
 *       - Resource Assignments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_id
 *               - task_id
 *               - allocation_percentage
 *               - start_date
 *               - end_date
 *               - planned_hours
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
 *                 description: Actual hours worked (optional)
 *     responses:
 *       201:
 *         description: Resource assignment created successfully
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
 *       400:
 *         description: Resource not available with alternative suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Resource is not available during this time.
 *                 reason:
 *                   type: string
 *                   example: availability_status or capacity_exceeded
 *                 details:
 *                   type: object
 *                   properties:
 *                     requestedHours:
 *                       type: number
 *                     existingHours:
 *                       type: number
 *                     totalRequiredHours:
 *                       type: number
 *                     availableCapacity:
 *                       type: number
 *                     exceedsBy:
 *                       type: number
 *                     durationInDays:
 *                       type: number
 *                     dailyCapacity:
 *                       type: number
 *                 alternatives:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
// Working days between two dates (exclude weekends) — must match workload API for allocation checks
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function calculateRequiredHours(startDate: string | Date, endDate: string | Date, dailyWorkingHours: number = 8) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = calculateWorkingDays(start, end);
  const totalRequiredHours = daysDiff * dailyWorkingHours;
  return {
    startDate: start,
    endDate: end,
    durationInDays: daysDiff,
    dailyWorkingHours: dailyWorkingHours,
    totalRequiredHours: totalRequiredHours
  };
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const resource = await prisma.resource.findUnique({
      where: {
        resource_id: data.resource_id,
      }
    })
    
    const task = await prisma.task.findUnique({
      where: {
        task_id: data.task_id,
      }
    })

    if (!resource || !task) {
      return NextResponse.json({ error: "Resource or task not found" }, { status: 404 });
    }
    
    // PREREQUISITE: Resource must have availability_status = "available" to be assignable
    if (resource.availability_status !== "available") {
      return NextResponse.json({ 
        error: "Resource is not available for assignments",
        reason: "resource_not_available"
      }, { status: 400 });
    }

    if (data.planned_hours === 0) {
      return NextResponse.json({ error: "Planned hours cannot be 0" }, { status: 400 });
    }

    if (data.planned_hours < 0) {
      return NextResponse.json({ error: "Planned hours cannot be negative" }, { status: 400 });
    }

    if (data.planned_hours > task.estimated_hours) {
      return NextResponse.json({ error: "Planned hours cannot be greater than the task estimated hours" }, { status: 400 });
    }
    
    // the total required hours for the assignment based on the start and end date multiplied by the daily working hours
    const requiredHours = calculateRequiredHours(data.start_date, data.end_date);
    
    // conflict 1: the planned hours for the assignment is more than the required hours based on daily working hours it needs to be completed
    // example: Assignment duration = 5 working days
    // Daily working hours = 8
    // Available time = 5 × 8 = 40 hours
    // Planned hours = 50
    // Conflict = ✅ Yes → 50 > 40
    if (requiredHours.totalRequiredHours < data.planned_hours) {
      return NextResponse.json({ 
        error: `The planned hours for the assignment is more than the required hours it needs to be completed according to the daily working hours, where the planned hours are ${data.planned_hours} and the required hours are ${requiredHours.totalRequiredHours}`,
        details: {
          plannedHours: data.planned_hours,
          requiredHours: requiredHours.totalRequiredHours,
          durationInDays: requiredHours.durationInDays,
          dailyWorkingHours: requiredHours.dailyWorkingHours
        }
      }, { status: 400 });
    }
    
    // conflict 2: the resource will not be able to complete the assignment within the duration of the assignment
    if (data.planned_hours > resource.capacity * requiredHours.durationInDays) {
      return NextResponse.json({ 
        error: "The resource will not be able to complete the assignment within the duration of the assignment",
        details: {
          plannedHours: data.planned_hours,
          requiredHours: requiredHours.totalRequiredHours,
          durationInDays: requiredHours.durationInDays,
          dailyWorkingHours: requiredHours.dailyWorkingHours,
          capacity: resource.capacity,
          totalCapacity: resource.capacity * requiredHours.durationInDays
        }
      }, { status: 400 });
    } 

    // conflict 3: allow overlap only if total allocation % in the period does not exceed 100%
    const requestedStart = new Date(data.start_date);
    const requestedEnd = new Date(data.end_date);
    const requestedWorkingDays = calculateWorkingDays(requestedStart, requestedEnd);
    const totalCapacityHours = resource.capacity * requestedWorkingDays;

    const overlappingAssignments = await prisma.resourceAssignment.findMany({
      where: {
        resource_id: data.resource_id,
        AND: [
          { start_date: { lte: requestedEnd } },
          { end_date: { gte: requestedStart } },
        ],
      },
      include: {
        task: true,
      },
    });

    let allocatedHoursInPeriod = 0;
    for (const assignment of overlappingAssignments) {
      const aStart = new Date(assignment.start_date);
      const aEnd = new Date(assignment.end_date);
      const overlapStart = new Date(Math.max(aStart.getTime(), requestedStart.getTime()));
      const overlapEnd = new Date(Math.min(aEnd.getTime(), requestedEnd.getTime()));
      if (overlapStart <= overlapEnd) {
        const overlapWorkingDays = calculateWorkingDays(overlapStart, overlapEnd);
        const pct = Math.min(100, Math.max(0, assignment.allocation_percentage ?? 0)) / 100;
        allocatedHoursInPeriod += pct * resource.capacity * overlapWorkingDays;
      }
    }

    const newAllocationHours =
      (Math.min(100, Math.max(0, data.allocation_percentage ?? 0)) / 100) *
      resource.capacity *
      requestedWorkingDays;
    const wouldBeTotal = allocatedHoursInPeriod + newAllocationHours;

    if (wouldBeTotal > totalCapacityHours) {
      const alternativeResources = await prisma.resource.findMany({
        where: {
          availability_status: "available",
          role: resource.role,
          resource_id: { not: data.resource_id },
          assignments: {
            none: {
              AND: [
                { start_date: { lte: requestedEnd } },
                { end_date: { gte: requestedStart } },
              ],
            },
          },
        },
      });

      return NextResponse.json({
        error: "Resource is unavailable during the requested time period",
        conflictDetails: {
          requestedPeriod: { start: data.start_date, end: data.end_date },
          existingAssignments: overlappingAssignments.map((a) => ({
            assignmentId: a.assignment_id,
            taskName: a.task.name,
            assignedPeriod: { start: a.start_date, end: a.end_date },
          })),
          allocatedHoursInPeriod: Math.round(allocatedHoursInPeriod * 100) / 100,
          totalCapacityHours,
          requestedAllocationHours: Math.round(newAllocationHours * 100) / 100,
        },
        alternatives: alternativeResources,
      }, { status: 400 });
    }

    // All validations passed - create the assignment
    const newAssignment = await prisma.resourceAssignment.create({
      data: {
        resource_id: data.resource_id,
        task_id: data.task_id,
        allocation_percentage: data.allocation_percentage,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        planned_hours: data.planned_hours,
        actual_hours: data.actual_hours || 0,
      },
      include: {
        resource: true,
        task: true,
      }
    });

    const updatedTask = await prisma.task.update({
      where: {
        task_id: data.task_id,
      },
      data: {
        status: "in_progress",
      }
    });

    // Update task progress based on resource assignments
    const resourceAssignments = await prisma.resourceAssignment.findMany({
        where: { task_id: data.task_id },
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
        where: { task_id: data.task_id },
        data: taskUpdateData
    });

    return NextResponse.json({ newAssignment, updatedTask }, { status: 201 });
  } catch (error) {
    console.error("Error creating resource assignment:", error);
    
    // Return more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : "Failed to create resource assignment";
    
    return NextResponse.json({ 
      error: `Failed to create resource assignment: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined 
    }, { status: 500 });
  }
}