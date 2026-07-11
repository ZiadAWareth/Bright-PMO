import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import * as XLSX from 'xlsx';
import { CriticalPathService } from '@/lib/services/critical-path.service';

/**
 * @swagger
 * /api/projects/{id}/tasks/template/upload:
 *   post:
 *     summary: Upload Tasks template Excel file
 *     description: Process an Excel file and create tasks with dependencies from the template data
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to upload tasks for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing task data with dependency information
 *     responses:
 *       200:
 *         description: Tasks and dependencies uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Summary of the upload process
 *                 created_tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       task_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       wbs_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       is_milestone:
 *                         type: boolean
 *                       is_critical_path:
 *                         type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       field:
 *                         type: string
 *                       error:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_processed:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     dependencies:
 *                       type: object
 *                       properties:
 *                         total_processed:
 *                           type: integer
 *                         created:
 *                           type: integer
 *                         failed:
 *                           type: integer
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can upload templates." },
        { status: 403 }
      );
    }

    const params = await context.params;
    const projectId = parseInt(params.id);
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        wbs: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Check if required sheet exists
    if (!workbook.SheetNames.includes('Tasks')) {
      return NextResponse.json(
        { error: "Invalid template. Missing 'Tasks' sheet." },
        { status: 400 }
      );
    }

    const tasksSheet = workbook.Sheets['Tasks'];
    const tasksData = XLSX.utils.sheet_to_json(tasksSheet, { header: 1 }) as any[][];

    if (tasksData.length < 2) {
      return NextResponse.json(
        { error: "No task data found in the template" },
        { status: 400 }
      );
    }

    // Validate headers
    const expectedHeaders = [
      'Name', 'Description', 'WBS ID', 'Start Date', 'End Date', 'Duration',
      'Estimated Hours', 'Work Package', 'Priority', 'Status', 'Is Milestone', 'Is Critical Path',
      'Predecessor Task IDs', 'Dependency Type', 'Lag Time (Days)'
    ];
    
    const actualHeaders = tasksData[0];
    const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    // Process data rows (skip header)
    const dataRows = tasksData.slice(1);
    const createdTasks: any[] = [];
    const errors: any[] = [];
    const dependencyQueue: any[] = []; // Store dependency info for later processing

    // Create WBS lookup map
    const wbsMap = new Map();
    project.wbs.forEach(wbs => {
      wbsMap.set(wbs.wbs_id, wbs);
    });

    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 2; // Excel row number (accounting for header)
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell === '')) {
        continue;
      }

      try {
        // Map row data to object
        const taskData: any = {};
        expectedHeaders.forEach((header, index) => {
          taskData[header] = row[index];
        });

        // Validate required fields
        const requiredFields = ['Name', 'Description', 'WBS ID', 'Start Date', 'End Date'];
        for (const field of requiredFields) {
          if (!taskData[field] || taskData[field] === '') {
            errors.push({
              row: rowIndex,
              field,
              error: `${field} is required`
            });
            continue;
          }
        }

        // Skip this row if there were validation errors
        if (errors.some(error => error.row === rowIndex)) {
          continue;
        }

        // Validate WBS ID
        const wbsId = parseInt(taskData['WBS ID']);
        if (isNaN(wbsId) || !wbsMap.has(wbsId)) {
          errors.push({
            row: rowIndex,
            field: 'WBS ID',
            error: 'Invalid WBS ID. Must reference an existing WBS item in this project.'
          });
          continue;
        }

        // Parse and validate dates
        let startDate, endDate;
        try {
          startDate = new Date(taskData['Start Date']);
          endDate = new Date(taskData['End Date']);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date format');
          }
          
          if (startDate >= endDate) {
            errors.push({
              row: rowIndex,
              field: 'End Date',
              error: 'End Date must be after Start Date'
            });
            continue;
          }
        } catch (error) {
          errors.push({
            row: rowIndex,
            field: 'Start Date / End Date',
            error: 'Invalid date format. Use YYYY-MM-DD format.'
          });
          continue;
        }

        // Calculate duration if not provided or validate if provided
        const calculatedDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const providedDuration = taskData['Duration'] ? parseInt(taskData['Duration']) : calculatedDuration;
        
        if (providedDuration !== calculatedDuration) {
          // Use calculated duration but warn user
          console.log(`Row ${rowIndex}: Duration mismatch. Using calculated duration (${calculatedDuration}) instead of provided (${providedDuration})`);
        }

        // Parse optional fields with defaults
        const estimatedHours = taskData['Estimated Hours'] ? parseFloat(taskData['Estimated Hours']) : 0;
        const workPackage = taskData['Work Package'] || null;
        const priority = taskData['Priority'] || 'medium';
        const status = taskData['Status'] || 'todo';
        const isMilestone = taskData['Is Milestone'] === 'TRUE' || taskData['Is Milestone'] === true;
        const isCriticalPath = taskData['Is Critical Path'] === 'TRUE' || taskData['Is Critical Path'] === true;

        // Validate priority
        if (!['low', 'medium', 'high'].includes(priority)) {
          errors.push({
            row: rowIndex,
            field: 'Priority',
            error: 'Priority must be low, medium, or high'
          });
          continue;
        }

        // Validate status
        if (!['todo', 'in_progress', 'completed', 'on_hold'].includes(status)) {
          errors.push({
            row: rowIndex,
            field: 'Status',
            error: 'Status must be todo, in_progress, completed, or on_hold'
          });
          continue;
        }

        // Validate estimated hours
        if (estimatedHours < 0) {
          errors.push({
            row: rowIndex,
            field: 'Estimated Hours',
            error: 'Estimated Hours cannot be negative'
          });
          continue;
        }

        // Create task in database
        const newTask = await prisma.task.create({
          data: {
            name: taskData['Name'],
            description: taskData['Description'],
            wbs_id: wbsId,
            start_date: startDate,
            end_date: endDate,
            duration: calculatedDuration,
            estimated_hours: estimatedHours,
            work_package: workPackage,
            priority: priority as any,
            status: status as any,
            is_milestone: isMilestone,
            is_critical_path: isCriticalPath,
            progress_percentage: 0,
            actual_hours: 0,
            created_by: userId
          },
          include: {
            wbs: true
          }
        });

        // Create default budget for the task
        await prisma.budget.create({
          data: {
            project_id: projectId,
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

        createdTasks.push({
          task_id: newTask.task_id,
          name: newTask.name,
          wbs_name: newTask.wbs.name,
          status: newTask.status,
          priority: newTask.priority,
          is_milestone: newTask.is_milestone,
          is_critical_path: newTask.is_critical_path
        });

        // Extract dependency information for later processing
        const predecessorIds = taskData['Predecessor Task IDs'];
        const dependencyType = taskData['Dependency Type'];
        const lagTime = taskData['Lag Time (Days)'];

        if (predecessorIds && predecessorIds.toString().trim()) {
          // Parse comma-separated predecessor IDs
          const predecessorList = predecessorIds.toString().split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id !== '');

          for (const predecessorId of predecessorList) {
            const predId = parseInt(predecessorId);
            if (!isNaN(predId)) {
              dependencyQueue.push({
                rowIndex,
                successorTaskId: newTask.task_id,
                successorTaskName: newTask.name,
                predecessorTaskId: predId,
                dependencyType: dependencyType || 'finish_to_start',
                lagTime: lagTime ? parseInt(lagTime.toString()) : 0
              });
            } else {
              errors.push({
                row: rowIndex,
                field: 'Predecessor Task IDs',
                error: `Invalid predecessor task ID: "${predecessorId}". Must be a number.`
              });
            }
          }
        }

      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        errors.push({
          row: rowIndex,
          field: 'General',
          error: `Failed to create task: ${(error as Error).message}`
        });
      }
    }

    // Trigger critical path recalculation if tasks were created
    if (createdTasks.length > 0) {
      try {
        await CriticalPathService.recalculateForProject(projectId);
        console.log(`Critical path recalculated for project ${projectId} after bulk task creation`);
      } catch (cpmError) {
        console.error('Error recalculating critical path:', cpmError);
        // Don't fail the request if CPM calculation fails
      }
    }

    // Process dependencies after all tasks are created
    const dependencyResults = {
      created: 0,
      failed: 0,
      errors: [] as any[]
    };

    if (dependencyQueue.length > 0) {
      // Get all existing tasks in the project for dependency validation
      const allProjectTasks = await prisma.task.findMany({
        where: {
          wbs: {
            project_id: projectId
          }
        },
        select: {
          task_id: true,
          name: true
        }
      });

      const taskIdMap = new Map();
      allProjectTasks.forEach(task => {
        taskIdMap.set(task.task_id, task.name);
      });

      // Process each dependency
      for (const dep of dependencyQueue) {
        try {
          // Validate that predecessor task exists
          if (!taskIdMap.has(dep.predecessorTaskId)) {
            dependencyResults.errors.push({
              row: dep.rowIndex,
              field: 'Predecessor Task IDs',
              error: `Predecessor task ID ${dep.predecessorTaskId} not found in project. Available tasks: ${Array.from(taskIdMap.keys()).join(', ')}`
            });
            dependencyResults.failed++;
            continue;
          }

          // Validate dependency type
          const validDependencyTypes = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
          if (!validDependencyTypes.includes(dep.dependencyType)) {
            dependencyResults.errors.push({
              row: dep.rowIndex,
              field: 'Dependency Type',
              error: `Invalid dependency type "${dep.dependencyType}". Must be one of: ${validDependencyTypes.join(', ')}`
            });
            dependencyResults.failed++;
            continue;
          }

          // Validate lag time
          if (isNaN(dep.lagTime) || dep.lagTime < 0) {
            dependencyResults.errors.push({
              row: dep.rowIndex,
              field: 'Lag Time (Days)',
              error: `Invalid lag time "${dep.lagTime}". Must be a non-negative number.`
            });
            dependencyResults.failed++;
            continue;
          }

          // Prevent self-dependencies
          if (dep.predecessorTaskId === dep.successorTaskId) {
            dependencyResults.errors.push({
              row: dep.rowIndex,
              field: 'Predecessor Task IDs',
              error: `A task cannot depend on itself (task ${dep.predecessorTaskId})`
            });
            dependencyResults.failed++;
            continue;
          }

          // Check if dependency already exists
          const existingDependency = await prisma.taskDependency.findFirst({
            where: {
              predecessor_task_id: dep.predecessorTaskId,
              successor_task_id: dep.successorTaskId
            }
          });

          if (existingDependency) {
            dependencyResults.errors.push({
              row: dep.rowIndex,
              field: 'Predecessor Task IDs',
              error: `Dependency already exists between task ${dep.predecessorTaskId} and task ${dep.successorTaskId} (${dep.successorTaskName})`
            });
            dependencyResults.failed++;
            continue;
          }

          // Create the dependency
          await prisma.taskDependency.create({
            data: {
              predecessor_task_id: dep.predecessorTaskId,
              successor_task_id: dep.successorTaskId,
              dependency_type: dep.dependencyType as any,
              lag_time: dep.lagTime
            }
          });

          dependencyResults.created++;

        } catch (depError) {
          console.error(`Error creating dependency for row ${dep.rowIndex}:`, depError);
          dependencyResults.errors.push({
            row: dep.rowIndex,
            field: 'Dependencies',
            error: `Failed to create dependency: ${(depError as Error).message}`
          });
          dependencyResults.failed++;
        }
      }

      // Recalculate critical path again if dependencies were created
      if (dependencyResults.created > 0) {
        try {
          await CriticalPathService.recalculateForProject(projectId);
          console.log(`Critical path recalculated for project ${projectId} after dependency creation`);
        } catch (cpmError) {
          console.error('Error recalculating critical path after dependency creation:', cpmError);
        }
      }
    }

    const summary = {
      total_processed: dataRows.filter(row => row && !row.every(cell => !cell || cell === '')).length,
      successful: createdTasks.length,
      failed: errors.length,
      dependencies: {
        total_processed: dependencyQueue.length,
        created: dependencyResults.created,
        failed: dependencyResults.failed
      }
    };

    // Combine task and dependency errors
    const allErrors = [...errors, ...dependencyResults.errors];

    return NextResponse.json({
      message: `Processed ${summary.total_processed} tasks. Created ${summary.successful}, failed ${summary.failed}. Dependencies: ${dependencyResults.created} created, ${dependencyResults.failed} failed.`,
      created_tasks: createdTasks,
      errors: allErrors,
      summary
    });

  } catch (error) {
    console.error('Error uploading Tasks template:', error);
    return NextResponse.json(
      { error: 'Failed to process Tasks template' },
      { status: 500 }
    );
  }
}
