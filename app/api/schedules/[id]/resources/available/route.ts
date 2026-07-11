import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/resources/available - Get available resources for the schedule
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
        user_id: userId,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const department = searchParams.get('department');
    const skills = searchParams.get('skills'); // JSON string of required skills

    // Get all resources that are already assigned in this schedule
    const existingAssignments = await prisma.scheduleAssignment.findMany({
      where: { 
        task: { 
          schedule_id: scheduleId 
        } 
      },
      select: { resource_id: true },
    });
    
    const excludedIds = existingAssignments.map((r: { resource_id: number }) => r.resource_id);
    
    // Build where clause for available resources
    const where: any = {
      resource_id: {
        notIn: excludedIds,
      },
      availability_status: 'available',
    };
    
    if (type) where.type = type;
    if (department) where.department = department;
    
    const availableResources = await prisma.resource.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    // Filter by skills if provided
    let filteredResources = availableResources;
    if (skills) {
      try {
        const requiredSkills = JSON.parse(skills);
        filteredResources = availableResources.filter(resource => {
          const resourceSkills = resource.skills as any;
          return requiredSkills.every((skill: string) => 
            resourceSkills.skills?.includes(skill) || 
            resourceSkills.technologies?.includes(skill) ||
            resourceSkills.certifications?.includes(skill)
          );
        });
      } catch (error) {
        console.error('Error parsing skills filter:', error);
      }
    }

    return NextResponse.json(filteredResources);
  } catch (error) {
    console.error('Error fetching available resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available resources' },
      { status: 500 }
    );
  }
} 