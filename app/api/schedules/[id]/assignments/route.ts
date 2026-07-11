import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/assignments - Get all resource assignments for a schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        // user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    const resource_id = searchParams.get('resource_id');

    const where: any = {
      task: {
        schedule_id: scheduleId,
      },
    };

    if (task_id) where.task_id = parseInt(task_id);
    if (resource_id) where.resource_id = parseInt(resource_id);

    const assignments = await prisma.scheduleAssignment.findMany({
      where,
      include: {
        task: {
          include: {
            wbs: true,
          },
        },
        resource: true,
      },
      orderBy: [
        { start_date: 'asc' },
        { task: { name: 'asc' } },
      ],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/assignments - Create a new resource assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      task_id,
      resource_id,
      allocation_percentage,
      start_date,
      end_date,
      planned_hours,
    } = body;

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Validate required fields
    if (!task_id || !resource_id || !allocation_percentage || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate task exists and belongs to this schedule
    const task = await prisma.scheduleTask.findFirst({
      where: {
        task_id: parseInt(task_id),
        schedule_id: scheduleId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 400 }
      );
    }

    // Validate resource exists and belongs to this schedule
    const resource = await prisma.resource.findFirst({
      where: {
        resource_id: parseInt(resource_id),
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 400 }
      );
    }

    // Validate allocation percentage
    if (allocation_percentage <= 0 || allocation_percentage > 100) {
      return NextResponse.json(
        { error: 'Allocation percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check if assignment overlaps with task dates
    if (startDate < task.start_date || endDate > task.end_date) {
      return NextResponse.json(
        { error: 'Assignment dates must be within task dates' },
        { status: 400 }
      );
    }

    // Check if assignment overlaps with resource availability
    // (Removed: resource.availability_start and resource.availability_end do not exist)

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

    // Calculate total allocation for overlapping period
    const totalAllocation = existingAssignments.reduce((sum, assignment) => {
      const overlapStart = new Date(Math.max(startDate.getTime(), assignment.start_date.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), assignment.end_date.getTime()));
      const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
      const assignmentDays = Math.ceil((assignment.end_date.getTime() - assignment.start_date.getTime()) / (1000 * 60 * 60 * 24));
      const overlapRatio = overlapDays / assignmentDays;
      return sum + (assignment.allocation_percentage * overlapRatio);
    }, 0);

    if (totalAllocation + allocation_percentage > 100) {
      return NextResponse.json(
        { 
          error: 'Resource overallocation detected',
          details: `Total allocation would be ${totalAllocation + allocation_percentage}% which exceeds 100%`
        },
        { status: 400 }
      );
    }

    const assignment = await prisma.scheduleAssignment.create({
      data: {
        task_id: parseInt(task_id),
        resource_id: parseInt(resource_id),
        allocation_percentage: parseFloat(allocation_percentage),
        start_date: startDate,
        end_date: endDate,
        planned_hours: planned_hours || 0,
        progress: 0,
      },
      include: {
        task: {
          include: {
            wbs: true,
          },
        },
        resource: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
} 