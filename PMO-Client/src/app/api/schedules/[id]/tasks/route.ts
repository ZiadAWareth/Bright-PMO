import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/tasks - Get all tasks for a schedule
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
    const wbs_id = searchParams.get('wbs_id');
    const status = searchParams.get('status');
    const is_critical_path = searchParams.get('is_critical_path');

    const where: any = { schedule_id: scheduleId };
    if (wbs_id) where.wbs_id = parseInt(wbs_id);
    if (status) where.status = status;
    if (is_critical_path) where.is_critical_path = is_critical_path === 'true';

    const tasks = await prisma.scheduleTask.findMany({
      where,
      include: {
        wbs: true,
        assignments: {
          include: {
            resource: true,
          },
        },
        budget: true, // was budgets: true
        risks: true,
        predecessors: {
          include: {
            predecessor: true,
          },
        },
        successors: {
          include: {
            successor: true,
          },
        },
        risk_mitigations: true,
      },
      orderBy: [
        { start_date: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/tasks - Create a new task
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
      name,
      description,
      wbs_id,
      start_date,
      end_date,
      duration,
      estimated_hours,
      planned_hours,
      work_package,
      is_milestone,
      is_critical_path,
      priority,
      required_skills,
      dependencies,
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
    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates and handle date-only strings to avoid timezone shifts
    let startDate: Date;
    let endDate: Date;
    
    if (typeof start_date === 'string' && start_date.length === 10) {
      // If it's just a date (YYYY-MM-DD), parse as local date to avoid timezone shift
      const [year, month, day] = start_date.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      startDate = new Date(start_date);
    }
    
    if (typeof end_date === 'string' && end_date.length === 10) {
      // If it's just a date (YYYY-MM-DD), parse as local date to avoid timezone shift
      const [year, month, day] = end_date.split('-').map(Number);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      endDate = new Date(end_date);
    }
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Validate WBS if provided
    if (wbs_id) {
      const wbs = await prisma.scheduleWBS.findFirst({
        where: {
          wbs_id: parseInt(wbs_id),
          schedule_id: scheduleId,
        },
      });

      if (!wbs) {
        return NextResponse.json(
          { error: 'WBS item not found' },
          { status: 400 }
        );
      }
    }

    // Calculate duration if not provided
    let calculatedDuration = duration;
    if (!calculatedDuration) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      calculatedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const task = await prisma.scheduleTask.create({
      data: {
        schedule_id: scheduleId,
        wbs_id: wbs_id ? parseInt(wbs_id) : null,
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        duration: calculatedDuration,
        estimated_hours: estimated_hours || 0,
        planned_hours: planned_hours || 0,
        work_package,
        is_milestone: is_milestone || false,
        is_critical_path: is_critical_path || false,
        priority: priority || 'medium',
        status: 'todo',
        required_skills: required_skills || {},
        dependencies: dependencies || [],
        progress_percentage: 0,
      },
      include: {
        wbs: true,
        assignments: {
          include: {
            resource: true,
          },
        },
        budget: true, // was budgets: true
        risks: true,
        predecessors: {
          include: {
            predecessor: true,
          },
        },
        successors: {
          include: {
            successor: true,
          },
        },
        risk_mitigations: true,
      },
    });

    // Create a ScheduleBudget entry for the new task with planned_amount 0
    await prisma.scheduleBudget.create({
      data: {
        schedule_id: scheduleId,
        task_id: task.task_id,
        planned_amount: 0,
        actual_amount: 0,
        variance: 0,
        cost_type: 'General',
        threshold: 0,
        fiscal_year: new Date().getFullYear(),
        fiscal_period: '',
        description: '',
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 