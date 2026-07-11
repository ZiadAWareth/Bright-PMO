import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules - List all schedules for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // user_id: userId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [schedules, total] = await Promise.all([
      prisma.projectSchedule.findMany({
        where,
        include: {
          creator: {
            include: {
              account: true,
            },
          },
          project: true,
          _count: {
            select: {
              tasks: true,
              risks: true,
              conflicts: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.projectSchedule.count({ where }),
    ]);

    // Transform schedules to include computed fields
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      total_tasks: schedule._count?.tasks ?? 0,
      total_budget: null, // budget_amount removed from model, set to null for now
      end_date: schedule.planned_end_date, // Map planned_end_date to end_date for frontend
    }));

    return NextResponse.json({
      schedules: transformedSchedules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      start_date,
      end_date,
      estimated_budget,
      priority,
      notes,
      portfolio_id,
      eps_level_id,
    } = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, start_date, and end_date are required' },
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

    if (estimated_budget && estimated_budget < 0) {
      return NextResponse.json(
        { error: 'Budget cannot be negative' },
        { status: 400 }
      );
    }

    // Validate portfolio_id if provided
    if (portfolio_id) {
      const portfolio = await prisma.portfolio.findUnique({
        where: { portfolio_id: parseInt(portfolio_id) }
      });
      if (!portfolio) {
        return NextResponse.json(
          { error: 'Invalid portfolio_id' },
          { status: 400 }
        );
      }
    }

    // Validate eps_level_id if provided
    if (eps_level_id) {
      const eps = await prisma.ePS.findUnique({
        where: { eps_id: parseInt(eps_level_id) }
      });
      if (!eps) {
        return NextResponse.json(
          { error: 'Invalid eps_level_id' },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.projectSchedule.create({
      data: {
        name,
        description: description || '',
        user_id: userId,
        start_date: startDate,
        planned_end_date: endDate,
        budget_amount: estimated_budget || 0,
        priority: (() => {
          const p = (priority || 'MEDIUM').toLowerCase();
          return p === 'critical' ? 'high' : p as 'low' | 'medium' | 'high';
        })(),
        type: 'commercial', // Default type
        status: 'draft',
        notes: notes || null,
        feasibility_score: 0,
        conflicts_count: 0,
        portfolio_id: portfolio_id ? parseInt(portfolio_id) : null,
        eps_level_id: eps_level_id ? parseInt(eps_level_id) : null,
      },
      include: {
        creator: {
          include: {
            account: true,
          },
        },
        portfolio: true,
        eps: true,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
} 