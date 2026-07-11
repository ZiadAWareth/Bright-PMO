import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import * as XLSX from 'xlsx';

/**
 * @swagger
 * /api/projects/{id}/tasks/template/download:
 *   get:
 *     summary: Download Tasks template Excel file
 *     description: Generate and download an Excel template for Task creation with reference data
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to download Tasks template for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can download templates." },
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

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        wbs: {
          orderBy: [
            { level: 'asc' },
            { wbs_id: 'asc' }
          ]
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Instructions
    const instructionsData = [
      ['TASKS TEMPLATE INSTRUCTIONS'],
      [''],
      ['This template allows you to create multiple tasks at once for your project.'],
      [''],
      ['IMPORTANT INSTRUCTIONS:'],
      ['1. Fill in the "Tasks" sheet with your task data'],
      ['2. Use the "WBS Reference" sheet to find the correct WBS ID for each task'],
      ['3. Remove the sample data row before uploading'],
      ['4. Save the file and upload it through the system'],
      [''],
      ['FIELD REQUIREMENTS:'],
      ['Required Fields: Name, Description, WBS ID, Start Date, End Date, Duration'],
      ['Optional Fields: Estimated Hours, Work Package, Priority, Status, Is Milestone, Is Critical Path'],
      [''],
      ['FIELD FORMATS:'],
      ['- Dates: YYYY-MM-DD (e.g., 2025-01-07)'],
      ['- Duration: Number of days (auto-calculated from dates)'],
      ['- Estimated Hours: Numeric value (e.g., 40)'],
      ['- Priority: low, medium, high'],
      ['- Status: todo, in_progress, completed, on_hold'],
      ['- Is Milestone: TRUE or FALSE'],
      ['- Is Critical Path: TRUE or FALSE'],
      [''],
      ['DATA VALIDATION:'],
      ['- WBS ID must reference existing WBS items in your project'],
      ['- Start Date must be before End Date'],
      ['- Duration will be calculated automatically'],
      ['- Estimated Hours cannot be negative'],
      [''],
      ['TIPS:'],
      ['- Use copy/paste to speed up data entry'],
      ['- Check the WBS Reference sheet for available WBS items'],
      ['- Review all data before uploading'],
      ['- Contact support if you encounter issues']
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    
    // Set column widths for instructions
    instructionsSheet['!cols'] = [{ wch: 80 }];
    
    // Add some basic formatting
    if (instructionsSheet['A1']) {
      instructionsSheet['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Sheet 2: Tasks Template
    const taskHeaders = [
      'Name',
      'Description', 
      'WBS ID',
      'Start Date',
      'End Date',
      'Duration',
      'Estimated Hours',
      'Work Package',
      'Priority',
      'Status',
      'Is Milestone',
      'Is Critical Path',
      'Predecessor Task IDs',
      'Dependency Type',
      'Lag Time (Days)'
    ];

    // Sample data for reference
    const sampleTask = [
      'Sample Task - Remove This Row',
      'This is a sample task description. Please remove this row before uploading.',
      project.wbs[0]?.wbs_id || '',
      '2025-01-07',
      '2025-01-14',
      '7',
      '40',
      'WP-001',
      'medium',
      'todo',
      'FALSE',
      'FALSE',
      '', // Predecessor Task IDs (empty for sample)
      'finish_to_start', // Dependency Type
      '0' // Lag Time
    ];

    const tasksData = [taskHeaders, sampleTask];
    const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);

    // Set column widths for tasks sheet
    tasksSheet['!cols'] = [
      { wch: 25 }, // Name
      { wch: 40 }, // Description
      { wch: 10 }, // WBS ID
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 10 }, // Duration
      { wch: 15 }, // Estimated Hours
      { wch: 15 }, // Work Package
      { wch: 12 }, // Priority
      { wch: 15 }, // Status
      { wch: 12 }, // Is Milestone
      { wch: 15 }, // Is Critical Path
      { wch: 20 }, // Predecessor Task IDs
      { wch: 18 }, // Dependency Type
      { wch: 15 }  // Lag Time
    ];

    // Add data validation for dropdowns
    const validationRules = [
      {
        range: 'I2:I1000', // Priority column
        type: 'list',
        formula: '"low,medium,high"'
      },
      {
        range: 'J2:J1000', // Status column
        type: 'list', 
        formula: '"todo,in_progress,completed,on_hold"'
      },
      {
        range: 'K2:K1000', // Is Milestone column
        type: 'list',
        formula: '"TRUE,FALSE"'
      },
      {
        range: 'L2:L1000', // Is Critical Path column
        type: 'list',
        formula: '"TRUE,FALSE"'
      },
      {
        range: 'N2:N1000', // Dependency Type column
        type: 'list',
        formula: '"finish_to_start,start_to_start,finish_to_finish,start_to_finish"'
      }
    ];

    // Add data validation (simplified approach)
    tasksSheet['!dataValidation'] = validationRules;

    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');

    // Sheet 3: WBS Reference
    const wbsReferenceHeaders = ['WBS ID', 'WBS Code', 'WBS Name', 'Level', 'Description'];
    const wbsReferenceData = [
      wbsReferenceHeaders,
      ...project.wbs.map(wbs => [
        wbs.wbs_id,
        wbs.wbs_code,
        wbs.name,
        wbs.level,
        wbs.description || ''
      ])
    ];

    const wbsReferenceSheet = XLSX.utils.aoa_to_sheet(wbsReferenceData);
    
    // Set column widths for WBS reference
    wbsReferenceSheet['!cols'] = [
      { wch: 10 }, // WBS ID
      { wch: 20 }, // WBS Code
      { wch: 30 }, // WBS Name
      { wch: 8 },  // Level
      { wch: 40 }  // Description
    ];

    XLSX.utils.book_append_sheet(workbook, wbsReferenceSheet, 'WBS Reference');

    // Sheet 4: Task Reference (for dependencies)
    // Get existing tasks from the project to help with dependency setup
    const existingTasks = await prisma.task.findMany({
      where: { 
        wbs: { 
          project_id: projectId 
        } 
      },
      select: {
        task_id: true,
        name: true,
        wbs: {
          select: {
            name: true,
            wbs_code: true
          }
        }
      },
      orderBy: { task_id: 'asc' }
    });

    const taskReferenceHeaders = ['Task ID', 'Task Name', 'WBS', 'WBS Code'];
    const taskReferenceData = [
      taskReferenceHeaders,
      ...existingTasks.map(task => [
        task.task_id,
        task.name,
        task.wbs.name,
        task.wbs.wbs_code
      ])
    ];

    // Add instructions if no tasks exist yet
    if (existingTasks.length === 0) {
      taskReferenceData.push([
        'INFO', 
        'No existing tasks found in this project.', 
        'Create tasks first to set up dependencies.', 
        ''
      ]);
    }

    const taskReferenceSheet = XLSX.utils.aoa_to_sheet(taskReferenceData);
    
    // Set column widths for task reference
    taskReferenceSheet['!cols'] = [
      { wch: 10 }, // Task ID
      { wch: 40 }, // Task Name
      { wch: 25 }, // WBS
      { wch: 15 }  // WBS Code
    ];

    XLSX.utils.book_append_sheet(workbook, taskReferenceSheet, 'Task Reference');

    // Sheet 5: Field Definitions
    const fieldDefinitionsData = [
      ['FIELD DEFINITIONS AND REQUIREMENTS'],
      [''],
      ['Field Name', 'Required', 'Format/Values', 'Description'],
      ['Name', 'Yes', 'Text', 'Task name - must be unique within the WBS'],
      ['Description', 'Yes', 'Text', 'Detailed description of the task'],
      ['WBS ID', 'Yes', 'Number', 'Must match an existing WBS ID from WBS Reference sheet'],
      ['Start Date', 'Yes', 'YYYY-MM-DD', 'Task start date (e.g., 2025-01-07)'],
      ['End Date', 'Yes', 'YYYY-MM-DD', 'Task end date (must be after start date)'],
      ['Duration', 'Yes', 'Number', 'Duration in days (auto-calculated from dates)'],
      ['Estimated Hours', 'No', 'Number', 'Estimated work hours for the task'],
      ['Work Package', 'No', 'Text', 'Work package identifier (optional)'],
      ['Priority', 'No', 'low/medium/high', 'Task priority level (default: medium)'],
      ['Status', 'No', 'todo/in_progress/completed/on_hold', 'Current task status (default: todo)'],
      ['Is Milestone', 'No', 'TRUE/FALSE', 'Whether this task is a milestone (default: FALSE)'],
      ['Is Critical Path', 'No', 'TRUE/FALSE', 'Whether this task is on critical path (default: FALSE)'],
      ['Predecessor Task IDs', 'No', 'Comma-separated numbers', 'IDs of tasks that must finish before this task (e.g., "1,3,5")'],
      ['Dependency Type', 'No', 'finish_to_start/start_to_start/finish_to_finish/start_to_finish', 'Type of dependency relationship (default: finish_to_start)'],
      ['Lag Time (Days)', 'No', 'Number', 'Number of days to wait after dependency is met (default: 0)'],
      [''],
      ['NOTES:'],
      ['- All required fields must be filled'],
      ['- WBS ID must exist in your project'],
      ['- Dates must be in YYYY-MM-DD format'],
      ['- Duration will be calculated from start and end dates'],
      ['- Boolean fields (Is Milestone, Is Critical Path) accept TRUE/FALSE'],
      ['- Predecessor Task IDs: Use comma-separated Task IDs from Task Reference sheet'],
      ['- Dependencies will be created automatically during upload'],
      ['- If multiple predecessors have different dependency types, use separate rows']
    ];

    const fieldDefinitionsSheet = XLSX.utils.aoa_to_sheet(fieldDefinitionsData);
    
    // Set column widths for field definitions
    fieldDefinitionsSheet['!cols'] = [
      { wch: 20 }, // Field Name
      { wch: 10 }, // Required
      { wch: 25 }, // Format/Values
      { wch: 50 }  // Description
    ];

    XLSX.utils.book_append_sheet(workbook, fieldDefinitionsSheet, 'Field Definitions');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    // Create response with proper headers
    const response = new NextResponse(excelBuffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="tasks_template_project_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    response.headers.set('Content-Length', excelBuffer.length.toString());

    return response;

  } catch (error) {
    console.error('Error generating Tasks template:', error);
    return NextResponse.json(
      { error: 'Failed to generate Tasks template' },
      { status: 500 }
    );
  }
}
