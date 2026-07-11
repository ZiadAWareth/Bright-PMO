import { NextRequest, NextResponse } from 'next/server';
import { CriticalPathService } from '@/lib/services/critical-path.service';

// GET - Fetch current critical path data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid project ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get prisma instance
    const { prisma } = await import('@/lib/prisma');
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Fetch all tasks with critical path data
    const tasks = await prisma.task.findMany({
      where: {
        wbs: { project_id: projectId }
      },
      include: {
        wbs: {
          select: { name: true }
        },
        assigned_users: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { early_start: 'asc' }
    });

    const criticalTasks = tasks.filter(task => task.is_critical_path);
    const nonCriticalTasks = tasks.filter(task => !task.is_critical_path);
    
    const projectDuration = Math.max(...tasks.map(t => 
      new Date(t.early_finish || t.end_date).getTime()
    )) - Math.min(...tasks.map(t => 
      new Date(t.early_start || t.start_date).getTime()
    ));
    
    const criticalPathDuration = criticalTasks.length > 0 
      ? Math.max(...criticalTasks.map(t => 
          new Date(t.early_finish || t.end_date).getTime()
        )) - Math.min(...criticalTasks.map(t => 
          new Date(t.early_start || t.start_date).getTime()
        ))
      : 0;

    const maxFloat = Math.max(...tasks.map(t => t.total_float || 0), 0);

    const response = {
      success: true,
      project_id: projectId,
      calculation_summary: {
        total_tasks: tasks.length,
        critical_tasks_count: criticalTasks.length,
        non_critical_tasks_count: nonCriticalTasks.length,
        project_duration: Math.ceil(projectDuration / (24 * 60 * 60 * 1000)),
        critical_path_duration: Math.ceil(criticalPathDuration / (24 * 60 * 60 * 1000)),
        max_float: maxFloat,
        last_calculated: new Date().toISOString()
      },
      critical_tasks: criticalTasks,
      all_tasks: tasks,
      execution_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching critical path:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch critical path',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST - Calculate/recalculate critical path
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid project ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get prisma instance
    const { prisma } = await import('@/lib/prisma');

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Use the single source of truth: CriticalPathService (includes backward-pass fix for terminal tasks)
    const cpmTasks = await CriticalPathService.calculateCriticalPath(projectId);

    if (cpmTasks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tasks found for this project',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Re-fetch tasks with relations so response shape matches GET (wbs name, assigned_users)
    const tasks = await prisma.task.findMany({
      where: {
        wbs: { project_id: projectId }
      },
      include: {
        wbs: { select: { name: true } },
        assigned_users: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
                account: {
                  select: { first_name: true, last_name: true }
                }
              }
            }
          }
        }
      },
      orderBy: { early_start: 'asc' }
    });

    // Debug: log what we read back from DB (to detect if something overwrote our write)
    console.log('📋 CPM DEBUG - After re-fetch from DB (POST response):');
    tasks.forEach((t) => {
      console.log(`   READ task_id=${t.task_id} ${t.name} | is_critical_path=${t.is_critical_path} total_float=${t.total_float} early_start=${t.early_start?.toISOString().slice(0, 10)} late_start=${t.late_start?.toISOString().slice(0, 10)}`);
    });

    const criticalTasks = tasks.filter(t => t.is_critical_path);
    const projectDuration = Math.max(...tasks.map(t =>
      new Date(t.early_finish || t.end_date).getTime()
    )) - Math.min(...tasks.map(t =>
      new Date(t.early_start || t.start_date).getTime()
    ));
    const criticalPathDuration = criticalTasks.length > 0
      ? Math.max(...criticalTasks.map(t =>
          new Date(t.early_finish || t.end_date).getTime()
        )) - Math.min(...criticalTasks.map(t =>
          new Date(t.early_start || t.start_date).getTime()
        ))
      : 0;
    const totalDuration = criticalTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const maxFloat = Math.max(...tasks.map(t => t.total_float ?? 0), 0);

    const executionTime = Date.now() - startTime;

    const response = {
      success: true,
      message: 'Critical path calculated successfully',
      project_id: projectId,
      calculation_summary: {
        total_tasks: tasks.length,
        critical_tasks_count: criticalTasks.length,
        non_critical_tasks_count: tasks.length - criticalTasks.length,
        project_duration: Math.ceil(projectDuration / (24 * 60 * 60 * 1000)),
        critical_path_duration: totalDuration,
        max_float: maxFloat,
        last_calculated: new Date().toISOString()
      },
      critical_tasks: criticalTasks,
      all_tasks: tasks,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error calculating critical path:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate critical path',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT - Update critical path settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid project ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // For now, just acknowledge the request
    // Future implementations can handle specific settings
    
    return NextResponse.json({
      success: true,
      message: 'Critical path settings updated',
      project_id: projectId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating critical path settings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update critical path settings',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear critical path calculations
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid project ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get prisma instance
    const { prisma } = await import('@/lib/prisma');

    // Reset all critical path calculations for the project
    await prisma.task.updateMany({
      where: { 
        wbs: { project_id: projectId } 
      },
      data: {
        early_start: null,
        early_finish: null,
        late_start: null,
        late_finish: null,
        total_float: 0,
        free_float: 0,
        is_critical_path: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Critical path calculations cleared successfully',
      project_id: projectId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error clearing critical path calculations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear critical path calculations',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
