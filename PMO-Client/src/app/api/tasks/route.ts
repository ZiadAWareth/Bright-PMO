import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { CriticalPathService } from '@/lib/services/critical-path.service';
import { ActivityLogger } from '@/lib/activity-logger';

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieves a list of all tasks with their relationships
 *     tags:
 *       - Tasks
 *     responses:
 *       200:
 *         description: A list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   task_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   wbs_id:
 *                     type: integer
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                   duration:
 *                     type: integer
 *                   progress_percentage:
 *                     type: number
 *                   status:
 *                     type: string
 *                   priority:
 *                     type: integer
 *                   is_milestone:
 *                     type: boolean
 *                   is_critical_path:
 *                     type: boolean
 *       500:
 *         description: Server error
 */
// GET all Tasks
export async function GET() {
  try {
    const { userId, role } = await getUserFromHeaders();

    const tasks = await prisma.task.findMany({
      where: (role === "ADMIN" || role === "PJM") ? undefined : {
        assigned_users: {
          some: {
            user_id: userId,
          },
        },
      },
      include: {
        wbs: {
          include: {
            project: true,
          },
        },
        resourceAssignments: true,
        budgets: true,
        documents: true,
        predecessor_dependencies: true,
        successor_dependencies: true,
        assigned_users: true,
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task (Industry Standard)
 *     description: Creates a new task with calculated dates based on duration and predecessors (like Primavera P6/MS Project)
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - wbs_id
 *               - duration
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               wbs_id:
 *                 type: integer
 *               duration:
 *                 type: integer
 *                 description: Duration in working days
 *               predecessor_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of predecessor task IDs
 *               relationship_type:
 *                 type: string
 *                 enum: [finish_to_start, start_to_start, finish_to_finish, start_to_finish]
 *                 default: finish_to_start
 *               lag_time:
 *                 type: integer
 *                 default: 0
 *                 description: Lag time in days
 *               is_milestone:
 *                 type: boolean
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, completed, on_hold]
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log('Received task creation data:', JSON.stringify(data, null, 2));
    
    const user_role = req.headers.get("x-user-role");
    const user_id = Number(req.headers.get("x-user-id"));

    if (user_role !== "ADMIN" && user_role !== "PJM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!data.name || data.wbs_id === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name and wbs_id are required" },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }
    }

    // Get WBS with project information for validation
    const wbs = await prisma.wBS.findUnique({
      where: { wbs_id: data.wbs_id },
      include: {
        project: {
          select: {
            project_id: true,
            name: true,
            must_finish_by_date: true,
            start_date: true
          }
        }
      }
    });

    if (!wbs) {
      return NextResponse.json({ error: 'WBS not found' }, { status: 404 });
    }

    // FIXED: Only check against PROJECT deadline, not WBS dates
    let deadline_warning = null;
    if (data.end_date && wbs.project.must_finish_by_date) {
      const taskEnd = new Date(data.end_date);
      const projectDeadline = new Date(wbs.project.must_finish_by_date);
      
      if (taskEnd > projectDeadline) {
        const daysOver = Math.ceil((taskEnd.getTime() - projectDeadline.getTime()) / (1000 * 60 * 60 * 24));
        deadline_warning = `⚠️ Task end date (${taskEnd.toLocaleDateString()}) exceeds PROJECT deadline (${projectDeadline.toLocaleDateString()}) by ${daysOver} days`;
        console.log(deadline_warning);
      }
    }

    // FIXED: Check against project start date constraint  
    if (data.start_date && wbs.project.start_date) {
      const taskStart = new Date(data.start_date);
      const projectStart = new Date(wbs.project.start_date);
      
      if (taskStart < projectStart) {
        return NextResponse.json(
          { error: `Task start date cannot be before project start date (${projectStart.toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create task with frontend-calculated dates
      const newTask = await tx.task.create({
        data: {
          name: data.name,
          description: data.description || '',
          wbs_id: data.wbs_id,
          duration: data.duration || 1,
          start_date: data.start_date ? new Date(data.start_date) : new Date(),
          end_date: data.end_date ? new Date(data.end_date) : new Date(),
          priority: data.priority || 'medium',
          status: data.status || 'todo',
          is_milestone: data.is_milestone || false,
          estimated_hours: data.estimated_hours || (data.duration || 1) * 8,
          created_by: user_id,
          progress_percentage: data.progress_percentage || 0,
          actual_hours: data.actual_hours || 0,
          work_package: data.work_package || '',
        },
      });

      // Create task dependencies if provided
      if (data.predecessor_ids && data.predecessor_ids.length > 0) {
        const dependencies = data.predecessor_ids.map((predId: number) => ({
          predecessor_task_id: predId,
          successor_task_id: newTask.task_id,
          dependency_type: data.relationship_type || 'finish_to_start',
          lag_time: data.lag_time || 0
        }));

        await tx.taskDependency.createMany({
          data: dependencies
        });
      }

      // Create budget entry (keep in transaction with task)
      await tx.budget.create({
        data: {
          project_id: wbs.project.project_id,
          task_id: newTask.task_id,
          cost_type: 'TASK_BUDGET',
          planned_amount: 0,
          actual_amount: 0,
          variance: 0,
          threshold: 0,
          fiscal_year: new Date().getFullYear(),
          fiscal_period: 'Q1',
        },
      });

      return newTask;
    });

    // WBS/project date rollup AFTER commit (avoids transaction timeout on deep hierarchies)
    try {
      console.log(`🚀 Starting bottom-up date calculation from task: ${result.name}`);
      await updateWBSDatesSimple(prisma, data.wbs_id);
    } catch (rollupError) {
      console.error('Error updating WBS/project dates after task create:', rollupError);
      // Task is already created; don't fail the request
    }

    // Recalculate critical path (existing logic)
    try {
      await CriticalPathService.recalculateForProject(wbs.project.project_id);
    } catch (cpmError) {
      console.error('Error recalculating critical path:', cpmError);
    }

    // Log activity (existing logic)
    await ActivityLogger.logTaskActivity(
      user_id,
      'create',
      result.task_id,
      result.name,
      wbs.project?.name || '',
      `Created new task: ${result.name}`,
      {
        project_id: wbs.project.project_id,
        project_name: wbs.project?.name,
        additional_info: {
          task_id: result.task_id,
          task_name: result.name,
          wbs_id: result.wbs_id,
          duration: result.duration,
          deadline_warning
        }
      }
    );

    const response = {
      ...result,
      message: "Task created successfully. WBS and project dates updated via bottom-up calculation.",
      ...(deadline_warning && { deadline_warning })
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Enhanced WBS date rollup with full hierarchy support
async function updateWBSDatesSimple(tx: any, wbs_id: number) {
  console.log(`🔄 Updating WBS dates for WBS ID: ${wbs_id}`);
  
  // Get all direct tasks for this WBS
  const wbsTasks = await tx.task.findMany({
    where: { wbs_id },
    select: { start_date: true, end_date: true, name: true },
    orderBy: { start_date: 'asc' }
  });

  // Get all child WBS items for this WBS
  const childWBS = await tx.wBS.findMany({
    where: { parent_wbs_id: wbs_id },
    select: { start_date: true, end_date: true, name: true, wbs_id: true },
    orderBy: { start_date: 'asc' }
  });

  console.log(`📊 WBS ${wbs_id}: Found ${wbsTasks.length} tasks and ${childWBS.length} child WBS`);

  // Combine all dates from tasks and child WBS
  const allDates: { start_date: Date | null, end_date: Date | null }[] = [
    ...wbsTasks,
    ...childWBS.filter((wbs: { start_date: Date | null, end_date: Date | null }) => wbs.start_date && wbs.end_date) // Only include child WBS with dates
  ];

  if (allDates.length > 0) {
    // Calculate earliest start and latest end from all sources
    const earliest_start = allDates.reduce((earliest: Date | null, item: any) => 
      !earliest || (item.start_date && item.start_date < earliest) ? item.start_date : earliest, null);
    
    const latest_end = allDates.reduce((latest: Date | null, item: any) => 
      !latest || (item.end_date && item.end_date > latest) ? item.end_date : latest, null);

    console.log(`📅 WBS ${wbs_id}: Updating dates - Start: ${earliest_start?.toISOString()}, End: ${latest_end?.toISOString()}`);

    // Update this WBS with calculated dates
    await tx.wBS.update({
      where: { wbs_id },
      data: {
        start_date: earliest_start,
        end_date: latest_end,
        updated_at: new Date()
      }
    });

    // Get parent info for recursive rollup
    const wbs = await tx.wBS.findUnique({
      where: { wbs_id },
      select: { parent_wbs_id: true, project_id: true, name: true, level: true }
    });

    console.log(`🔼 WBS ${wbs_id} (${wbs?.name}, Level ${wbs?.level}) updated. Parent: ${wbs?.parent_wbs_id}`);

    // Recursively update parent WBS
    if (wbs?.parent_wbs_id) {
      console.log(`⬆️  Continuing rollup to parent WBS ${wbs.parent_wbs_id}`);
      await updateWBSDatesSimple(tx, wbs.parent_wbs_id);
    } else if (wbs?.project_id) {
      // This is root WBS - update project
      console.log(`🎯 Reached root WBS - updating project ${wbs.project_id}`);
      await updateProjectDatesSimple(tx, wbs.project_id);
    }
  } else {
    console.log(`⚠️  WBS ${wbs_id}: No tasks or child WBS with dates to calculate from`);
  }
}

// Enhanced project date rollup with proper root WBS handling
async function updateProjectDatesSimple(tx: any, project_id: number) {
  console.log(`🎯 Updating project dates for project ID: ${project_id}`);
  
  // Get ALL WBS items for this project (not just root level)
  const allWbsItems = await tx.wBS.findMany({
    where: { project_id },
    select: { 
      start_date: true, 
      end_date: true, 
      name: true, 
      level: true, 
      wbs_id: true,
      parent_wbs_id: true 
    }
  });

  // Filter to only WBS items that have calculated dates
  const validWbsItems = allWbsItems.filter((wbs: any) => wbs.start_date && wbs.end_date);
  
  console.log(`📊 Project ${project_id}: Found ${allWbsItems.length} total WBS, ${validWbsItems.length} with dates`);

  if (validWbsItems.length > 0) {
    // Calculate project dates from ALL WBS with dates
    const earliest_start = validWbsItems.reduce((earliest: Date | null, wbs: any) => 
      !earliest || wbs.start_date < earliest ? wbs.start_date : earliest, null);
    
    const latest_end = validWbsItems.reduce((latest: Date | null, wbs: any) => 
      !latest || wbs.end_date > latest ? wbs.end_date : latest, null);

    console.log(`📅 Project ${project_id}: Calculated dates - Start: ${earliest_start?.toISOString()}, End: ${latest_end?.toISOString()}`);

    // Update project with calculated dates
    const updatedProject = await tx.project.update({
      where: { project_id },
      data: {
        start_date: earliest_start,
        planned_end_date: latest_end, // This is the calculated end date
        updated_at: new Date()
      },
      select: { 
        planned_end_date: true, 
        must_finish_by_date: true, 
        name: true 
      }
    });

    // Check if project exceeds deadline
    if (updatedProject.planned_end_date && updatedProject.must_finish_by_date) {
      const calculatedEnd = updatedProject.planned_end_date ? new Date(updatedProject.planned_end_date) : new Date();
      const deadline = new Date(updatedProject.must_finish_by_date);
      
      if (calculatedEnd > deadline) {
        const daysOver = Math.ceil((calculatedEnd.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`⚠️  PROJECT DEADLINE WARNING: ${updatedProject.name} will finish ${daysOver} days late!`);
        console.log(`   Calculated end: ${calculatedEnd.toLocaleDateString()}`);
        console.log(`   Must finish by: ${deadline.toLocaleDateString()}`);
        
        // TODO: Send notification to stakeholders about deadline breach
      } else {
        console.log(`✅ Project ${updatedProject.name} is within deadline`);
      }
    }
  } else {
    console.log(`⚠️  Project ${project_id}: No WBS items with dates to calculate from`);
  }
}