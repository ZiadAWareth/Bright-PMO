import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// GET /api/schedules/[id]/wbs - Get all WBS items for a schedule
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

    const wbsItems = await prisma.scheduleWBS.findMany({
      where: { schedule_id: scheduleId },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
            tasks: {
              include: {
                user_assignments: {
                  include: {
                    user: {
                      select: {
                        user_id: true,
                        username: true,
                        email: true,
                        account: {
                          select: {
                            first_name: true,
                            last_name: true,
                          }
                        }
                      }
                    }
                  }
                },
              },
            },
            procurements: true,
            budget: true, // include budget for children
          },
        },
        tasks: {
          include: {
            assignments: {
              include: {
                resource: true,
              },
            },
            budget: true, // include budget for each task
            user_assignments: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    username: true,
                    email: true,
                    account: {
                      select: {
                        first_name: true,
                        last_name: true,
                      }
                    }
                  }
                }
              }
            },
          },
        },
        procurements: true,
        budget: true, // include budget for top-level WBS
      },
      orderBy: [
        { level: 'asc' },
        { wbs_code: 'asc' },
      ],
    });

    return NextResponse.json(wbsItems);
  } catch (error) {
    console.error('Error fetching WBS items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WBS items' },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/wbs - Create a new WBS item
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
      wbs_code,
      name,
      description,
      parent_wbs_id,
      level,
      start_date,
      end_date,
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

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }



    // Validate parent WBS if provided
    if (parent_wbs_id) {
      const parentWBS = await prisma.scheduleWBS.findFirst({
        where: {
          wbs_id: parseInt(parent_wbs_id),
          schedule_id: scheduleId,
        },
      });

      if (!parentWBS) {
        return NextResponse.json(
          { error: 'Parent WBS item not found' },
          { status: 400 }
        );
      }
    }

    // Check if level 1 already exists for this schedule (root level)
    if (level === 1) {
      const existingLevel1 = await prisma.scheduleWBS.findFirst({
        where: {
          schedule_id: scheduleId,
          level: 1,
        },
      });

      if (existingLevel1) {
        return NextResponse.json(
          { error: 'A Level 1 (Root) WBS already exists for this schedule. You can only have one root level.' },
          { status: 400 }
        );
      }
    }

    // Generate WBS code if not provided
    let finalWbsCode = wbs_code;
    if (!finalWbsCode) {
      const count = await prisma.scheduleWBS.count({
        where: { schedule_id: scheduleId },
      });
      finalWbsCode = `WBS-${scheduleId}-${count + 1}`;
    }

    const wbsItem = await prisma.scheduleWBS.create({
      data: {
        schedule_id: scheduleId,
        wbs_code: finalWbsCode,
        name,
        description,
        parent_wbs_id: parent_wbs_id ? parseInt(parent_wbs_id) : null,
        level: level || 1,
        start_date: startDate,
        end_date: endDate,
        progress_percentage: 0,
        status: 'not_started',
      },
      include: {
        parent: true,
        children: true,
        tasks: true,
      },
    });

    // Create a ScheduleBudget for this WBS with planned_amount 0
    await prisma.scheduleBudget.create({
      data: {
        schedule_id: scheduleId,
        wbs_id: wbsItem.wbs_id,
        planned_amount: 0,
        actual_amount: 0,
        variance: 0,
        threshold: 0,
        cost_type: 'WBS_BUDGET',
        fiscal_year: new Date().getFullYear(),
        fiscal_period: `${new Date().getMonth() + 1}`,
        description: `Budget for WBS ${wbsItem.name}`,
      },
    });

    return NextResponse.json(wbsItem, { status: 201 });
  } catch (error) {
    console.error('Error creating WBS item:', error);
    return NextResponse.json(
      { error: 'Failed to create WBS item' },
      { status: 500 }
    );
  }
}

 