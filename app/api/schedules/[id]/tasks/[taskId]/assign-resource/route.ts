import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// POST /api/schedules/[id]/tasks/[taskId]/assign-resource
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scheduleId = parseInt(id);
    const taskIdInt = parseInt(taskId);
    if (isNaN(scheduleId) || isNaN(taskIdInt)) {
      return NextResponse.json({ error: 'Invalid schedule or task ID' }, { status: 400 });
    }
    const body = await request.json();
    const {
      resource_id,
      allocation_percentage,
      planned_hours,
      start_date,
      end_date,
    } = body;
    // Validate required fields
    if (!resource_id || !allocation_percentage || !planned_hours || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Validate task exists and belongs to this schedule
    const task = await prisma.scheduleTask.findFirst({
      where: {
        task_id: taskIdInt,
        schedule_id: scheduleId,
      },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 400 });
    }
    // Validate resource exists
    const resource = await prisma.resource.findFirst({
      where: {
        resource_id: parseInt(resource_id),
      },
    });
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 400 });
    }
    // Validate allocation percentage
    if (allocation_percentage <= 0 || allocation_percentage > 100) {
      return NextResponse.json({ error: 'Allocation percentage must be between 1 and 100' }, { status: 400 });
    }
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }
    // Check if assignment overlaps with task dates
    if (startDate < task.start_date || endDate > task.end_date) {
      return NextResponse.json({ error: 'Assignment dates must be within task dates' }, { status: 400 });
    }
    // Check for existing assignments that might conflict
    const existingAssignments = await prisma.scheduleAssignment.findMany({
      where: {
        resource_id: parseInt(resource_id),
        OR: [
          {
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
      },
    });
    // Block if resource is already assigned to any other task in this period
    if (existingAssignments.length > 0) {
      return NextResponse.json({
        error: 'Resource is already assigned to another task in this period.'
      }, { status: 400 });
    }
    // Check for actual (real) assignments in the ResourceAssignment model that overlap with the requested period
    const actualAssignments = await prisma.resourceAssignment.findMany({
      where: {
        resource_id: parseInt(resource_id),
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
    });
    if (actualAssignments.length > 0) {
      return NextResponse.json({
        error: 'Resource is already assigned to an actual (real) task in this period.'
      }, { status: 400 });
    }
    // Calculate total allocation for overlapping period (robust)
    const totalAllocation = existingAssignments.reduce((sum, assignment) => {
      const overlapStart = new Date(Math.max(startDate.getTime(), assignment.start_date.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), assignment.end_date.getTime()));
      const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
      if (overlapMs <= 0) return sum; // Ignore zero/negative overlap
      const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));
      const assignmentDays = Math.ceil((assignment.end_date.getTime() - assignment.start_date.getTime()) / (1000 * 60 * 60 * 24));
      const overlapRatio = overlapDays / assignmentDays;
      return sum + (assignment.allocation_percentage * overlapRatio);
    }, 0);
    if (totalAllocation + allocation_percentage > 100) {
      return NextResponse.json({
        error: 'Resource overallocation detected',
        details: `Total allocation would be ${totalAllocation + allocation_percentage}% which exceeds 100%`
      }, { status: 400 });
    }
    // Check if all allocations for this task would exceed 100%
    const taskAssignments = await prisma.scheduleAssignment.findMany({
      where: {
        task_id: taskIdInt,
      },
    });
    const taskTotalAllocation = taskAssignments.reduce((sum, a) => sum + a.allocation_percentage, 0);
    if (taskTotalAllocation + allocation_percentage > 100) {
      return NextResponse.json({
        error: 'Total allocation for this task would exceed 100%',
        details: `Current: ${taskTotalAllocation}%, New: ${allocation_percentage}%, Total: ${taskTotalAllocation + allocation_percentage}%`,
      }, { status: 400 });
    }
    // Create the assignment
    const assignment = await prisma.scheduleAssignment.create({
      data: {
        task_id: taskIdInt,
        resource_id: parseInt(resource_id),
        allocation_percentage: parseFloat(allocation_percentage),
        start_date: startDate,
        end_date: endDate,
        planned_hours: planned_hours || 0,
        progress: 0,
      },
      include: {
        task: true,
        resource: true,
      },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating scheduled resource assignment:', error);
    return NextResponse.json({ error: 'Failed to create scheduled resource assignment' }, { status: 500 });
  }
} 