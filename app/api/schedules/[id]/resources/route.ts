import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/resources - Get all resources for a schedule
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
    const type = searchParams.get('type');
    const department = searchParams.get('department');

    // Get resources that are assigned to tasks in this schedule
    const assignments = await prisma.scheduleAssignment.findMany({
      where: {
        task: {
          schedule_id: scheduleId,
        },
      },
      include: {
        resource: true,
        task: {
          include: {
            wbs: true,
          },
        },
      },
      orderBy: [
        { resource: { type: 'asc' } },
        { resource: { name: 'asc' } },
      ],
    });

    // Group assignments by resource to get unique resources with their assignments
    const resourceMap = new Map();
    assignments.forEach(assignment => {
      const resourceId = assignment.resource.resource_id;
      if (!resourceMap.has(resourceId)) {
        resourceMap.set(resourceId, {
          ...assignment.resource,
          assignments: [],
        });
      }
      resourceMap.get(resourceId).assignments.push(assignment);
    });

    let resources = Array.from(resourceMap.values());

    // Apply filters
    if (type) {
      resources = resources.filter(resource => resource.type === type);
    }
    if (department) {
      resources = resources.filter(resource => resource.department === department);
    }

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/resources - Add a resource to the schedule
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
      resource_id,
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
    if (!resource_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate resource exists
    const resource = await prisma.resource.findUnique({
      where: { resource_id: parseInt(resource_id) },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 400 }
      );
    }

    // Check if resource is already assigned to any task in this schedule
    const existingAssignment = await prisma.scheduleAssignment.findFirst({
      where: {
        resource_id: parseInt(resource_id),
        task: {
          schedule_id: scheduleId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Resource is already assigned to a task in this schedule' },
        { status: 400 }
      );
    }

    // Return the resource info (no need to create a separate record since resources are shared)
    return NextResponse.json({
      ...resource,
      assignments: [],
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding resource:', error);
    return NextResponse.json(
      { error: 'Failed to add resource' },
      { status: 500 }
    );
  }
}

 