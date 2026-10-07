import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkMilestoneCompletion, triggerEVMCalculation } from '@/lib/server/entities';
import { WorkflowTriggerService } from '@/lib/services/workflow-trigger.service';
import { CriticalPathService } from '@/lib/services/critical-path.service';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { weightedProgressAverage } from '@/lib/wbs-progress-utils';


/**
 * @swagger
 * /api/tasks/{task_id}:
 *   get:
 *     summary: Get a task by ID
 *     description: Retrieves a specific task by its ID with all related data
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task_id:
 *                   type: integer
 *                 wbs_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 end_date:
 *                   type: string
 *                   format: date
 *                 actual_start_date:
 *                   type: string
 *                   format: date
 *                 actual_end_date:
 *                   type: string
 *                   format: date
 *                 status:
 *                   type: string
 *                 progress_percentage:
 *                   type: number
 *                   format: float
 *                 priority:
 *                   type: string
 *                 wbs:
 *                   type: object
 *                 resourceAssignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 budgets:
 *                   type: array
 *                   items:
 *                     type: object
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                 predecessor_dependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                 successor_dependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
// GET single Task by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    
    // Get user information for access control
    const user = await getUserFromHeaders();
    
    const task = await prisma.task.findUnique({
      where: { task_id: parseInt(task_id) },
      include: {
        wbs: true,
        resourceAssignments: true,
        budgets: {
          select:{
            planned_amount: true,
            actual_amount: true,
            cost_type: true,
            wbs_id: true,
            task_id: true,
            created_at: true,
          }
        },
        documents: true,
        assigned_users: true,
        // Get tasks that THIS task depends on (where this task is the successor)
        successor_dependencies: {
          include: {
            predecessor: {
              select: {
                task_id: true,
                name: true,
                status: true,
                progress_percentage: true,
                end_date: true
              }
            }
          }
        },
        // Get tasks that depend on THIS task (where this task is the predecessor)
        predecessor_dependencies: {
          include: {
            successor: {
              select: {
                task_id: true,
                name: true,
                status: true,
                progress_percentage: true,
                end_date: true
              }
            }
          }
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check if task is locked due to dependencies
    // Use successor_dependencies (tasks that THIS task depends on)
    const isTaskLocked = task.successor_dependencies.some(dep => {
      if (dep.predecessor.task_id === task.task_id) {
        return false;
      }
      
      switch (dep.dependency_type) {
        case "finish_to_start":
          return dep.predecessor.status !== "completed";
        case "start_to_start":
          return dep.predecessor.status === "todo";
        case "finish_to_finish":
          return dep.predecessor.status !== "completed";
        case "start_to_finish":
          return dep.predecessor.status === "todo";
        default:
          return false;
      }
    });

    // Check if user can access locked tasks
    const canAccessLocked = user?.role ? 
      ["ADMIN", "ADMINISTRATOR", "PJM", "PROJECT MANAGER", "PROJECT-MANAGER", "PMO"]
        .includes(user.role.toUpperCase()) : false;

    // If task is locked and user doesn't have permission, return access denied
    if (isTaskLocked && !canAccessLocked) {
      return NextResponse.json(
        { 
          error: "Access denied. This task is locked due to incomplete dependencies. Contact a Project Manager, PMO, or Administrator for access.",
          locked: true,
          reasons: task.predecessor_dependencies
            .filter(dep => {
              // Skip self-dependencies (invalid data)
              if (dep.successor.task_id === task.task_id) {
                return false;
              }
              
              switch (dep.dependency_type) {
                case "finish_to_start":
                  return dep.successor.status !== "completed";
                case "start_to_start":
                  return dep.successor.status === "todo";
                case "finish_to_finish":
                  return dep.successor.status !== "completed";
                case "start_to_finish":
                  return dep.successor.status === "todo";
                default:
                  return false;
              }
            })
            .map(dep => {
              let reasonText = "";
              switch (dep.dependency_type) {
                case "finish_to_start":
                  reasonText = `"${dep.successor.name}" must be completed first`;
                  break;
                case "start_to_start":
                  reasonText = `"${dep.successor.name}" must be started first`;
                  break;
                case "finish_to_finish":
                  reasonText = `"${dep.successor.name}" must be completed before this task can finish`;
                  break;
                case "start_to_finish":
                  reasonText = `"${dep.successor.name}" must be started before this task can finish`;
                  break;
              }
              return reasonText;
            })
        },
        { status: 403 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch task: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}:
 *   put:
 *     summary: Update a task
 *     description: Updates an existing task by ID and triggers any associated workflow rules
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               wbs_id:
 *                 type: integer
 *                 description: ID of the WBS this task belongs to
 *               name:
 *                 type: string
 *                 description: Name of the task
 *               description:
 *                 type: string
 *                 description: Description of the task
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Planned start date
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Planned end date
 *               actual_start_date:
 *                 type: string
 *                 format: date
 *                 description: Actual start date
 *               actual_end_date:
 *                 type: string
 *                 format: date
 *                 description: Actual end date
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, completed, on_hold]
 *                 description: Current status of the task
 *               progress_percentage:
 *                 type: number
 *                 format: float
 *                 description: Task completion percentage
 *               priority:
 *                 type: string
 *                 description: Task priority level
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// PUT update Task
export async function PUT(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  console.log("🚀 PUT REQUEST STARTED");
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const taskId = parseInt(task_id);

    console.log(`📝 Updating task ${taskId}`);
    
    const data = await req.json();

    // Process the data to handle possible nested objects
    const processedData = { ...data };
    delete processedData.wbs; // Remove wbs object if present
    delete processedData.assigned_users; // Remove assigned users
    delete processedData.resourceAssignments; // Remove resource assignments
    delete processedData.creator; // Remove creator
    
    // Handle WBS relationship properly
    if (processedData.wbs_id !== undefined) {
      if (processedData.wbs_id && processedData.wbs_id !== '' && processedData.wbs_id !== null) {
        // Connect to a WBS if wbs_id is provided and valid
        processedData.wbs = {
          connect: { wbs_id: parseInt(processedData.wbs_id) }
        };
      }
      // Always remove the direct wbs_id field as it's not a valid Prisma field
      delete processedData.wbs_id;
    }

    // No status mapping needed - frontend now uses same values as Prisma schema
    
    // Convert date strings to DateTime objects if they exist
    if (processedData.start_date && typeof processedData.start_date === 'string') {
      // If it's just a date (YYYY-MM-DD), add time component for start of day
      if (processedData.start_date.length === 10) {
        processedData.start_date = new Date(processedData.start_date + 'T00:00:00.000Z');
      } else {
        processedData.start_date = new Date(processedData.start_date);
      }
    }

    if (processedData.end_date && typeof processedData.end_date === 'string') {
      // If it's just a date (YYYY-MM-DD), add time component for end of day
      if (processedData.end_date.length === 10) {
        processedData.end_date = new Date(processedData.end_date + 'T23:59:59.999Z');
      } else {
        processedData.end_date = new Date(processedData.end_date);
      }
    }

    if (processedData.actual_start_date && typeof processedData.actual_start_date === 'string') {
      if (processedData.actual_start_date.length === 10) {
        processedData.actual_start_date = new Date(processedData.actual_start_date + 'T00:00:00.000Z');
      } else {
        processedData.actual_start_date = new Date(processedData.actual_start_date);
      }
    }

    if (processedData.actual_end_date && typeof processedData.actual_end_date === 'string') {
      if (processedData.actual_end_date.length === 10) {
        processedData.actual_end_date = new Date(processedData.actual_end_date + 'T23:59:59.999Z');
      } else {
        processedData.actual_end_date = new Date(processedData.actual_end_date);
      }
    }
    
    // Get current task for date validation and comparison
    const currentTask = await prisma.task.findUnique({
      where: { task_id: taskId },
      include: {
        wbs: {
          include: {
            project: {
              select: {
                project_id: true
              }
            }
          }
        },
        predecessor_dependencies: {
          include: {
            predecessor: {
              select: {
                task_id: true,
                name: true,
                start_date: true,
                end_date: true,
                status: true
              }
            }
          }
        },
        successor_dependencies: {
          include: {
            successor: {
              select: {
                task_id: true,
                name: true,
                start_date: true,
                end_date: true
              }
            }
          }
        }
      }
    });

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate WBS date boundaries if we have WBS ID and dates
    if (processedData.wbs_id && (processedData.start_date || processedData.end_date)) {
      const wbs = await prisma.wBS.findUnique({
        where: { wbs_id: processedData.wbs_id }
      });
      
      if (!wbs) {
        return NextResponse.json({ error: "WBS not found" }, { status: 404 });
      }
      
      // REMOVED: WBS date constraints to enable bottom-up scheduling
      // Tasks can now extend beyond WBS dates and trigger rollup calculations
      // Only project-level constraints remain for validation
    }

    // Validate task dates against predecessor dependencies (Industry Best Practice)
    if (processedData.start_date || processedData.end_date) {
      const newStartDate = processedData.start_date 
        ? new Date(processedData.start_date) 
        : currentTask.start_date;
      const newEndDate = processedData.end_date 
        ? new Date(processedData.end_date) 
        : currentTask.end_date;

      // Ensure end date is after start date
      if (newEndDate < newStartDate) {
        return NextResponse.json(
          {
            error: "Task end date cannot be before start date",
            details: {
              start_date: newStartDate,
              end_date: newEndDate
            }
          },
          { status: 400 }
        );
      }

      const violations: Array<{
        type: string;
        message: string;
        predecessor_id: number;
        predecessor_name: string;
        dependency_type: string;
        required_date: Date;
        provided_date: Date;
      }> = [];

      // Check all predecessor dependencies
      for (const dep of currentTask.predecessor_dependencies) {
        // Skip self-dependencies (invalid data)
        if (dep.predecessor.task_id === taskId) {
          continue;
        }

        const pred = dep.predecessor;
        const predStartDate = new Date(pred.start_date);
        const predEndDate = new Date(pred.end_date);

        switch (dep.dependency_type) {
          case "finish_to_start":
            // Finish-to-Start: Child cannot start before parent ends (including lag time)
            const minStartDate = new Date(predEndDate);
            if (dep.lag_time > 0) {
              minStartDate.setDate(minStartDate.getDate() + dep.lag_time);
            }
            
            if (newStartDate < minStartDate) {
              violations.push({
                type: "finish_to_start",
                message: `Task start date (${newStartDate.toLocaleDateString()}) violates Finish-to-Start dependency`,
                predecessor_id: pred.task_id,
                predecessor_name: pred.name,
                dependency_type: "finish_to_start",
                required_date: minStartDate,
                provided_date: newStartDate
              });
            }
            break;

          case "start_to_start":
            // Start-to-Start: Child cannot start before parent starts (including lag time)
            const minStartDateSS = new Date(predStartDate);
            if (dep.lag_time > 0) {
              minStartDateSS.setDate(minStartDateSS.getDate() + dep.lag_time);
            }
            
            if (newStartDate < minStartDateSS) {
              violations.push({
                type: "start_to_start",
                message: `Task start date (${newStartDate.toLocaleDateString()}) violates Start-to-Start dependency`,
                predecessor_id: pred.task_id,
                predecessor_name: pred.name,
                dependency_type: "start_to_start",
                required_date: minStartDateSS,
                provided_date: newStartDate
              });
            }
            break;

          case "finish_to_finish":
            // Finish-to-Finish: Child cannot finish before parent finishes (including lag time)
            const minEndDateFF = new Date(predEndDate);
            if (dep.lag_time > 0) {
              minEndDateFF.setDate(minEndDateFF.getDate() + dep.lag_time);
            }
            
            if (newEndDate < minEndDateFF) {
              violations.push({
                type: "finish_to_finish",
                message: `Task end date (${newEndDate.toLocaleDateString()}) violates Finish-to-Finish dependency`,
                predecessor_id: pred.task_id,
                predecessor_name: pred.name,
                dependency_type: "finish_to_finish",
                required_date: minEndDateFF,
                provided_date: newEndDate
              });
            }
            break;

          case "start_to_finish":
            // Start-to-Finish: Child cannot finish before parent starts (including lag time)
            const minEndDateSF = new Date(predStartDate);
            if (dep.lag_time > 0) {
              minEndDateSF.setDate(minEndDateSF.getDate() + dep.lag_time);
            }
            
            if (newEndDate < minEndDateSF) {
              violations.push({
                type: "start_to_finish",
                message: `Task end date (${newEndDate.toLocaleDateString()}) violates Start-to-Finish dependency`,
                predecessor_id: pred.task_id,
                predecessor_name: pred.name,
                dependency_type: "start_to_finish",
                required_date: minEndDateSF,
                provided_date: newEndDate
              });
            }
            break;
        }
      }

      // If violations exist, check if user wants to force the update
      if (violations.length > 0) {
        const forceUpdate = data.force === true;
        
        if (!forceUpdate) {
          const violationMessages = violations.map(v => {
            const lagText = v.required_date > new Date(v.provided_date) 
              ? ` (requires ${v.required_date.toLocaleDateString()} due to dependency on "${v.predecessor_name}")`
              : '';
            return `${v.message}${lagText}`;
          });

          return NextResponse.json(
            {
              error: "Task dates violate dependency constraints",
              violations: violationMessages,
              violationDetails: violations,
              suggestion: "Adjust the dates to comply with dependencies, or set 'force: true' to override validation",
              canForce: true
            },
            { status: 400 }
          );
        } else {
          // Log the override for audit purposes
          console.warn(
            `⚠️ User forced date update despite dependency violations for task ${taskId} (${currentTask.name}):`,
            violations.map(v => v.message)
          );
        }
      }
    }

    // Validate dependencies if status is being changed
    if (data.status) {
      // Get current task with dependencies
      const currentTask = await prisma.task.findUnique({
        where: { task_id: taskId },
        include: {
          successor_dependencies: {
            include: {
              predecessor: {
                select: {
                  task_id: true,
                  name: true,
                  status: true
                }
              }
            }
          }
        }
      });

      if (currentTask && currentTask.successor_dependencies.length > 0) {
        const newStatus = data.status;
        const incompleteDeps = currentTask.successor_dependencies.filter(dep => {
          const predStatus = dep.predecessor.status;
          
          // Check for self-dependency (data corruption check)
          if (dep.predecessor.task_id === taskId) {
            console.error(`⚠️ Self-dependency detected for task ${taskId}: ${currentTask.name}`);
            return true; // Block this invalid dependency
          }
          
          switch (dep.dependency_type) {
            case "finish_to_start":
              // Can't start or complete until predecessor is completed
              if (newStatus === "in_progress" || newStatus === "completed") {
                return predStatus !== "completed";
              }
              return false;
            case "start_to_start":
              // Can't start until predecessor has started
              if (newStatus === "in_progress") {
                return predStatus === "todo";
              }
              return false;
            case "finish_to_finish":
              // Can't complete until predecessor is completed
              if (newStatus === "completed") {
                return predStatus !== "completed";
              }
              return false;
            case "start_to_finish":
              // Can't complete until predecessor has started
              if (newStatus === "completed") {
                return predStatus === "todo";
              }
              return false;
            default:
              return false;
          }
        });

        if (incompleteDeps.length > 0) {
          const reasons = incompleteDeps.map(dep => {
            console.log("Dependency predecessor:", dep.predecessor);
            // Fix: Use dep.predecessor.name, not currentTask.name
            if (dep.predecessor.task_id === taskId) {
              return `⚠️ Invalid self-dependency detected. Please contact an administrator.`;
            }
            switch (dep.dependency_type) {
              case "finish_to_start":
                return `"${dep.predecessor.name}" must be completed first`;
              case "start_to_start":
                return `"${dep.predecessor.name}" must be started first`;
              case "finish_to_finish":
                return `"${dep.predecessor.name}" must be completed before this task can finish`;
              case "start_to_finish":
                return `"${dep.predecessor.name}" must be started before this task can finish`;
              default:
                return "";
            }
          });

          return NextResponse.json(
            {
              error: "Cannot update task status due to incomplete dependencies",
              reasons: reasons,
              incompleteDependencies: incompleteDeps.map(dep => ({
                predecessor_id: dep.predecessor.task_id,
                predecessor_name: dep.predecessor.name,
                dependency_type: dep.dependency_type,
                is_self_dependency: dep.predecessor.task_id === taskId
              }))
            },
            { status: 400 }
          );
        }
      }
    }

    // Track if dates changed for critical path recalculation
    const datesChanged = processedData.start_date || processedData.end_date;
    const projectId = currentTask.wbs?.project_id;

    // Update the task with processed data
    const updatedTask = await prisma.task.update({
      where: { task_id: taskId },
      data: processedData,
      include: {
        wbs: {
          include: {
            project: {
              select: {
                project_id: true
              }
            }
          }
        },
        assigned_users: {
          include: {
            user: true
          }
        },
        resourceAssignments: true,
        creator: true
      }
    });

    // After updating the task
    // Ensure progress is 100% if status is completed
    if (data.status === "completed" && updatedTask.progress_percentage < 100) {
      await prisma.task.update({
        where: { task_id: taskId },
        data: { progress_percentage: 100 }
      });
      updatedTask.progress_percentage = 100; // Keep local object in sync
    }

    // Recalculate WBS progress if task is completed or progress changed
    if (
  (data.status === "completed" || typeof data.progress_percentage !== "undefined") &&
  updatedTask.wbs?.wbs_id
) {
  // Calculate all tasks in this WBS
  const tasksInWBS = await prisma.task.findMany({
    where: { wbs_id: updatedTask.wbs.wbs_id }
  });
  const completedTasks = tasksInWBS.filter(t => t.status === "completed");
  const wbsProgress = tasksInWBS.length > 0
    ? Math.round((completedTasks.length / tasksInWBS.length) * 100)
    : 0;

  await prisma.wBS.update({
    where: { wbs_id: updatedTask.wbs.wbs_id },
    data: { progress_percentage: wbsProgress }
  });

  console.log(`Updating parent WBS ${updatedTask.wbs.wbs_id} progress to ${wbsProgress}%`);
  
  // ✅ FIX: Get the parent_wbs_id and project_id from the CURRENT WBS
  const currentWBS = await prisma.wBS.findUnique({
    where: { wbs_id: updatedTask.wbs.wbs_id },
    select: { parent_wbs_id: true, project_id: true }
  });

  // If this WBS has a parent, recalculate parent chain
  if (currentWBS?.parent_wbs_id) {
    console.log(`🔄 Starting parent chain recalculation from WBS ${currentWBS.parent_wbs_id}`);
    await recalculateParentWBSProgress(currentWBS.parent_wbs_id);
  } 
  // If this is a root WBS (no parent), update project directly
  else if (currentWBS?.project_id) {
    console.log(`🎯 This is root WBS, updating project ${currentWBS.project_id} directly`);
    await updateProjectProgress(currentWBS.project_id);
  }
}

    // Automatic successor date adjustment (Industry Best Practice - Optional)
    if (data.autoAdjustSuccessors === true && datesChanged && currentTask.successor_dependencies.length > 0) {
      const adjustedSuccessors: Array<{ task_id: number; name: string; changes: any }> = [];

      for (const dep of currentTask.successor_dependencies) {
        const successor = dep.successor;
        let needsUpdate = false;
        const updateData: any = {};

        const newStartDate = processedData.start_date 
          ? new Date(processedData.start_date) 
          : currentTask.start_date;
        const newEndDate = processedData.end_date 
          ? new Date(processedData.end_date) 
          : currentTask.end_date;

        switch (dep.dependency_type) {
          case "finish_to_start":
            // If parent end date changed, adjust child start date (including lag time)
            if (processedData.end_date) {
              const requiredStartDate = new Date(newEndDate);
              if (dep.lag_time > 0) {
                requiredStartDate.setDate(requiredStartDate.getDate() + dep.lag_time);
              }
              
              if (new Date(successor.start_date) < requiredStartDate) {
                updateData.start_date = requiredStartDate;
                // Recalculate end date based on duration if duration exists
                if (successor.end_date && successor.start_date) {
                  const duration = Math.ceil(
                    (new Date(successor.end_date).getTime() - new Date(successor.start_date).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  );
                  updateData.end_date = new Date(requiredStartDate);
                  updateData.end_date.setDate(updateData.end_date.getDate() + duration);
                }
                needsUpdate = true;
              }
            }
            break;

          case "start_to_start":
            // If parent start date changed, adjust child start date (including lag time)
            if (processedData.start_date) {
              const requiredStartDate = new Date(newStartDate);
              if (dep.lag_time > 0) {
                requiredStartDate.setDate(requiredStartDate.getDate() + dep.lag_time);
              }
              
              if (new Date(successor.start_date) < requiredStartDate) {
                updateData.start_date = requiredStartDate;
                // Recalculate end date based on duration
                if (successor.end_date && successor.start_date) {
                  const duration = Math.ceil(
                    (new Date(successor.end_date).getTime() - new Date(successor.start_date).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  );
                  updateData.end_date = new Date(requiredStartDate);
                  updateData.end_date.setDate(updateData.end_date.getDate() + duration);
                }
                needsUpdate = true;
              }
            }
            break;

          case "finish_to_finish":
            // If parent end date changed, adjust child end date (including lag time)
            if (processedData.end_date) {
              const requiredEndDate = new Date(newEndDate);
              if (dep.lag_time > 0) {
                requiredEndDate.setDate(requiredEndDate.getDate() + dep.lag_time);
              }
              
              if (new Date(successor.end_date) < requiredEndDate) {
                updateData.end_date = requiredEndDate;
                // Recalculate start date based on duration
                if (successor.end_date && successor.start_date) {
                  const duration = Math.ceil(
                    (new Date(successor.end_date).getTime() - new Date(successor.start_date).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  );
                  updateData.start_date = new Date(requiredEndDate);
                  updateData.start_date.setDate(updateData.start_date.getDate() - duration);
                }
                needsUpdate = true;
              }
            }
            break;

          case "start_to_finish":
            // If parent start date changed, adjust child end date (including lag time)
            if (processedData.start_date) {
              const requiredEndDate = new Date(newStartDate);
              if (dep.lag_time > 0) {
                requiredEndDate.setDate(requiredEndDate.getDate() + dep.lag_time);
              }
              
              if (new Date(successor.end_date) < requiredEndDate) {
                updateData.end_date = requiredEndDate;
                // Recalculate start date based on duration
                if (successor.end_date && successor.start_date) {
                  const duration = Math.ceil(
                    (new Date(successor.end_date).getTime() - new Date(successor.start_date).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  );
                  updateData.start_date = new Date(requiredEndDate);
                  updateData.start_date.setDate(updateData.start_date.getDate() - duration);
                }
                needsUpdate = true;
              }
            }
            break;
        }

        if (needsUpdate) {
          try {
            await prisma.task.update({
              where: { task_id: successor.task_id },
              data: updateData
            });
            adjustedSuccessors.push({
              task_id: successor.task_id,
              name: successor.name,
              changes: updateData
            });
          } catch (error) {
            console.error(`Error adjusting successor task ${successor.task_id}:`, error);
          }
        }
      }

      if (adjustedSuccessors.length > 0) {
        console.log(`✅ Automatically adjusted ${adjustedSuccessors.length} successor task(s) for task ${taskId}`);
      }
    }

    // Recalculate critical path if dates changed (Industry Best Practice)
    if (datesChanged && projectId) {
      try {
        await CriticalPathService.recalculateForProject(projectId);
        console.log(`✅ Critical path recalculated for project ${projectId} after task ${taskId} date update`);
      } catch (cpmError) {
        console.error('Error recalculating critical path after date update:', cpmError);
        // Don't fail the request if CPM calculation fails
      }
    }

    // If status has changed, trigger workflow rules
    if (data.status && updatedTask?.status !== data.status) {
      await WorkflowTriggerService.processTaskStatusChange(taskId, data.status);
    }

    // Create notifications for assigned users and creator
    const notificationPromises = [];

    // Notify assigned users
    if (updatedTask.assigned_users) {
      for (const assignment of updatedTask.assigned_users) {
        // Create notification
        notificationPromises.push(
          prisma.notification.create({
            data: {
              user_id: assignment.user_id,
              type: "TASK_UPDATE",
              title: "Task Updated",
              message: `Task \"${updatedTask.name}\" has been updated.`,
              priority: "MEDIUM",
              created_by_id: 1, // System user
              metadata: {
                task_id: taskId,
                changes: data
              }
            }
          })
        );
      }
    }

    // Notify task creator if they are not already in the assigned users list
    const creatorAlreadyNotified = updatedTask.assigned_users?.some(
      assignment => assignment.user_id === updatedTask.created_by
    );

    if (!creatorAlreadyNotified && updatedTask.creator?.email) {
      // Create notification
      notificationPromises.push(
        prisma.notification.create({
          data: {
            user_id: updatedTask.created_by,
            type: "TASK_UPDATE",
            title: "Task Updated",
            message: `Task \"${updatedTask.name}\" has been updated.`,
            priority: "MEDIUM",
            created_by_id: updatedTask.created_by,
            metadata: {
              task_id: taskId,
              changes: data
            }
          }
        })
      );
    }

    await Promise.all(notificationPromises);

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}:
 *   delete:
 *     summary: Delete a task
 *     description: Deletes a task by ID
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       500:
 *         description: Server error
 */
// DELETE Task
export async function DELETE(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const { userId, role } = await getUserFromHeaders();
    const taskId = parseInt(task_id);

    if (role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if task exists and get its details for cleanup
    const task = await prisma.task.findUnique({
      where: { task_id: taskId },
      include: {
        wbs: true,
        assigned_users: true,
        resourceAssignments: true,
        comments: true,
        predecessor_dependencies: true,
        successor_dependencies: true
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Perform cascading deletes in the correct order to avoid foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete task assignments (TaskAssignment table)
      await tx.taskAssignment.deleteMany({
        where: { task_id: taskId }
      });

      // 2. Delete resource assignments
      await tx.resourceAssignment.deleteMany({
        where: { task_id: taskId }
      });

      // 3. Delete task comments and their mentions
      const comments = await tx.taskComment.findMany({
        where: { task_id: taskId }
      });

      for (const comment of comments) {
        // Delete comment mentions first
        await tx.commentMention.deleteMany({
          where: { comment_id: comment.comment_id }
        });
      }

      // Delete comments
      await tx.taskComment.deleteMany({
        where: { task_id: taskId }
      });

      // 4. Delete task dependencies (both predecessor and successor)
      await tx.taskDependency.deleteMany({
        where: {
          OR: [
            { predecessor_task_id: taskId },
            { successor_task_id: taskId }
          ]
        }
      });

      // 5. Delete budgets associated with this task
      await tx.budget.deleteMany({
        where: { task_id: taskId }
      });

      // 6. Delete documents associated with this task
      await tx.document.deleteMany({
        where: { task_id: taskId }
      });

      // 7. Delete workflow rules (both trigger and action)
      await tx.workflowRule.deleteMany({
        where: {
          OR: [
            { trigger_task_id: taskId },
            { action_task: { task_id: taskId } }
          ]
        }
      });

      // 8. Delete performance metrics
      await tx.performanceMetric.deleteMany({
        where: { task_id: taskId }
      });

      // 9. Delete scorecards
      await tx.scorecard.deleteMany({
        where: { task_id: taskId }
      });

      // 10. Delete escalations
      await tx.escalation.deleteMany({
        where: { task_id: taskId }
      });

      // 11. Delete field data
      await tx.fieldData.deleteMany({
        where: { task_id: taskId }
      });

      // 12. Finally, delete the task itself
      await tx.task.delete({
        where: { task_id: taskId }
      });
    });

    // ✅ NOW ACTUALLY CALL THE PROGRESS RECALCULATION!
    try {
      console.log(`🗑️ Task ${taskId} deleted, recalculating WBS ${task.wbs_id} progress`);
      
      // Calculate remaining tasks for this WBS
      const remainingTasks = await prisma.task.findMany({
        where: { wbs_id: task.wbs_id }
      });

      const completedTasks = remainingTasks.filter(t => t.status === 'completed');
      const progressPercentage = remainingTasks.length > 0 
        ? Math.round((completedTasks.length / remainingTasks.length) * 100)
        : 0;

      console.log(`Calculated new progress for WBS ${task.wbs_id}: ${progressPercentage}%`);

      // Update WBS progress
      await prisma.wBS.update({
        where: { wbs_id: task.wbs_id },
        data: { progress_percentage: progressPercentage }
      });

      // Get both parent_wbs_id AND project_id
      const wbs = await prisma.wBS.findUnique({
        where: { wbs_id: task.wbs_id },
        select: { parent_wbs_id: true, project_id: true }
      });

      // If this WBS has a parent, recalculate parent chain
      if (wbs?.parent_wbs_id) {
        console.log(`🔄 Starting parent chain recalculation from WBS ${wbs.parent_wbs_id}`);
        await recalculateParentWBSProgress(wbs.parent_wbs_id);
      } 
      // If this is a root WBS (no parent), update project directly
      else if (wbs?.project_id) {
        console.log(`🎯 This is root WBS, updating project ${wbs.project_id} directly`);
        await updateProjectProgress(wbs.project_id);
      }
    } catch (progressError) {
      console.error('❌ Error updating WBS progress after task deletion:', progressError);
      // Don't fail the entire operation if progress update fails
    }

    return NextResponse.json(
      { message: "Task and all related data deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error('Task deletion error:', error);
    return NextResponse.json(
      { error: "Failed to delete task: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to recalculate parent WBS progress (uses optional progress_weight when set)
async function recalculateParentWBSProgress(parentWbsId: number): Promise<void> {
  try {
    console.log(`🔄 Recalculating progress for parent WBS ${parentWbsId}`);

    const childWBS = await prisma.wBS.findMany({
      where: { parent_wbs_id: parentWbsId },
      select: { progress_percentage: true, progress_weight: true }
    });
    const directTasks = await prisma.task.findMany({
      where: { wbs_id: parentWbsId },
      select: { progress_percentage: true, status: true }
    });

    console.log(`Found ${childWBS.length} child WBS and ${directTasks.length} direct tasks for WBS ${parentWbsId}`);

    const items: { progress: number; weight?: number | null }[] = [
      ...childWBS.map((w) => ({ progress: w.progress_percentage || 0, weight: w.progress_weight ?? null })),
      ...directTasks.map((t) => ({
        progress: t.status === 'completed' ? 100 : (t.progress_percentage || 0),
        weight: null
      }))
    ];
    const progressPercentage = items.length > 0 ? Math.round(weightedProgressAverage(items)) : 0;

    console.log(`Calculated progress for WBS ${parentWbsId}: ${progressPercentage}%`);

    await prisma.wBS.update({
      where: { wbs_id: parentWbsId },
      data: { progress_percentage: progressPercentage }
    });

    console.log(`✅ Updated WBS ${parentWbsId} progress to ${progressPercentage}%`);

    const parentWBS = await prisma.wBS.findUnique({
      where: { wbs_id: parentWbsId },
      select: { parent_wbs_id: true, project_id: true }
    });

    if (parentWBS?.parent_wbs_id) {
      await recalculateParentWBSProgress(parentWBS.parent_wbs_id);
    } else if (parentWBS?.project_id) {
      await updateProjectProgress(parentWBS.project_id);
    }
  } catch (error) {
    console.error(`❌ Error recalculating parent WBS ${parentWbsId} progress:`, error);
  }
}

// Helper to update project progress from all root WBS (weighted when progress_weight set)
async function updateProjectProgress(projectId: number): Promise<void> {
  try {
    console.log(`🔄 Updating project ${projectId} progress...`);

    const rootWBSList = await prisma.wBS.findMany({
      where: { project_id: projectId, parent_wbs_id: null },
      select: { progress_percentage: true, progress_weight: true }
    });

    if (rootWBSList.length === 0) {
      console.warn(`⚠️ No root WBS found for project ${projectId}, cannot update progress`);
      return;
    }

    const rootItems = rootWBSList.map((w) => ({
      progress: w.progress_percentage || 0,
      weight: w.progress_weight ?? null
    }));
    const projectProgress = weightedProgressAverage(rootItems);
    console.log(`Found ${rootWBSList.length} root WBS, weighted project progress: ${projectProgress}%`);

    const before = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { progress_percentage: true }
    });
    console.log(`📊 BEFORE UPDATE: Project ${projectId} is at ${before?.progress_percentage}%`);

    const result = await prisma.project.update({
      where: { project_id: projectId },
      data: { progress_percentage: projectProgress }
    });

    console.log(`✅ Project ${projectId} progress updated to ${result.progress_percentage}%`);

    const after = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { progress_percentage: true }
    });
    console.log(`🔍 AFTER UPDATE: Database shows project ${projectId} at ${after?.progress_percentage}%`);

    if (after?.progress_percentage !== result.progress_percentage) {
      console.error(`❌❌❌ MISMATCH! Update returned ${result.progress_percentage}%, but database shows ${after?.progress_percentage}%`);
    }
  } catch (error) {
    console.error(`❌ Error updating project ${projectId} progress:`, error);
  }
}

/**
 * @swagger
 * /api/tasks/{task_id}:
 *   post:
 *     summary: Trigger EVM calculation and milestone check
 *     description: Triggers EVM calculation for the task and checks milestone completion
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to process
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EVM calculation and milestone check triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: EVM calculation and milestone check triggered
 *       500:
 *         description: Server error
 */
// POST handle EVM calculation and milestone completion
export async function POST(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const taskId = parseInt(task_id);

    // Trigger EVM calculation
    await triggerEVMCalculation(taskId);

    // Check milestone completion
    await checkMilestoneCompletion();

    return NextResponse.json(
      { message: 'EVM calculation and milestone check triggered' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}