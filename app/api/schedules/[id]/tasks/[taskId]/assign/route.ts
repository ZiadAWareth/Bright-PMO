import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// POST /api/schedules/[id]/tasks/[taskId]/assign
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
    const taskIdInt = parseInt(taskId);
    if (isNaN(taskIdInt)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }
    const body = await request.json();
    const { user_id } = body;
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    // Check if assignment already exists
    const existing = await prisma.scheduleTaskAssignment.findFirst({
      where: {
        task_id: taskIdInt,
        user_id: parseInt(user_id),
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'User already assigned to this task' }, { status: 400 });
    }
    // Create assignment
    const assignment = await prisma.scheduleTaskAssignment.create({
      data: {
        task_id: taskIdInt,
        user_id: parseInt(user_id),
        assigned_by: userId,
      },
    });
    return NextResponse.json({ message: 'User assigned to task', assignment });
  } catch (error) {
    console.error('Error assigning user to schedule task:', error);
    return NextResponse.json({ error: 'Failed to assign user to task' }, { status: 500 });
  }
} 