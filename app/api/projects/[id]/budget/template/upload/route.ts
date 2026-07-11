import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * @swagger
 * /api/projects/{id}/budget/template/upload:
 *   post:
 *     summary: Upload budget template for bulk updates
 *     description: Uploads an Excel file with budget updates for WBS items and tasks
 *     tags:
 *       - Project Budget Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
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
 *                 description: Excel file with budget data
 *     responses:
 *       200:
 *         description: Budget updates processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updated_budgets:
 *                   type: array
 *                   items:
 *                     type: object
 *                 created_budgets:
 *                   type: array
 *                   items:
 *                     type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: object
 *       400:
 *         description: Invalid file or data
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */

interface BudgetRow {
  Item_Type: string;
  Item_ID: number;
  Item_Name: string;
  WBS_Code?: string;
  Level: number;
  Current_Planned_Amount: number;
  Current_Actual_Amount: number;
  Current_Variance: number;
  New_Planned_Amount?: number | string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { project_id: true, name: true, budget_amount: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload an Excel file." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames.includes("Budget_Data")) {
      return NextResponse.json(
        { error: "Budget_Data sheet not found in the uploaded file" },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets["Budget_Data"];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as BudgetRow[];

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "No data found in the Budget_Data sheet" },
        { status: 400 }
      );
    }

    // ===== SECURITY VALIDATION: Check existing budget data matches database =====
    // Get current budget data from database (same query as download route)
    const currentWBSFromDB = await prisma.wBS.findMany({
      where: { project_id: projectId },
      include: {
        budgets: true,
        tasks: {
          include: {
            budgets: true,
          },
        },
      },
      orderBy: [{ level: "asc" }, { wbs_code: "asc" }],
    });

    // Build expected budget data structure from database
    const expectedBudgetData: BudgetRow[] = [];
    
    for (const wbs of currentWBSFromDB) {
      // Get existing budget for this WBS
      let currentPlanned = 0;
      let currentActual = 0;
      let currentVariance = 0;

      if (wbs.level === 0) {
        // For root level WBS (level 0), use project-level budget or project.budget_amount
        const projectBudget = wbs.budgets.find(b => !b.wbs_id && !b.task_id);
        currentPlanned = projectBudget?.planned_amount || project.budget_amount || 0;
        currentActual = projectBudget?.actual_amount || 0;
        currentVariance = currentPlanned - currentActual;
      } else {
        // For non-root WBS items, sum all budgets for this WBS
        const wbsBudgets = wbs.budgets.filter(b => b.wbs_id === wbs.wbs_id);
        currentPlanned = wbsBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
        currentActual = wbsBudgets.reduce((sum, b) => sum + b.actual_amount, 0);
        currentVariance = wbsBudgets.reduce((sum, b) => sum + b.variance, 0);
      }

      expectedBudgetData.push({
        Item_Type: "WBS",
        Item_ID: wbs.wbs_id,
        Item_Name: wbs.name,
        WBS_Code: wbs.wbs_code,
        Level: wbs.level,
        Current_Planned_Amount: currentPlanned,
        Current_Actual_Amount: currentActual,
        Current_Variance: currentVariance,
      });

      // Add tasks for this WBS
      for (const task of wbs.tasks) {
        const taskBudgets = task.budgets.filter(b => b.task_id === task.task_id);
        
        const taskPlanned = taskBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
        const taskActual = taskBudgets.reduce((sum, b) => sum + b.actual_amount, 0);
        const taskVariance = taskBudgets.reduce((sum, b) => sum + b.variance, 0);

        expectedBudgetData.push({
          Item_Type: "Task",
          Item_ID: task.task_id,
          Item_Name: task.name,
          WBS_Code: "",
          Level: wbs.level + 1,
          Current_Planned_Amount: taskPlanned,
          Current_Actual_Amount: taskActual,
          Current_Variance: taskVariance,
        });
      }
    }

    // Validate existing budget data matches database
    const validationErrors = [];

    // Check if the number of items matches
    if (jsonData.length !== expectedBudgetData.length) {
      validationErrors.push({
        field: 'Budget Items Count',
        error: `Mismatch in budget items count. Database has ${expectedBudgetData.length} items, but Excel file has ${jsonData.length} items.`
      });
    }

    // Create a map of expected budget items for efficient lookup
    const expectedBudgetMap = new Map(
      expectedBudgetData.map(item => [`${item.Item_Type}_${item.Item_ID}`, item])
    );

    // Validate each budget item in the file matches the database
    for (let i = 0; i < jsonData.length; i++) {
      const fileBudget = jsonData[i];
      const budgetKey = `${fileBudget.Item_Type}_${fileBudget.Item_ID}`;
      
      if (!fileBudget.Item_ID) continue; // Skip header or empty rows

      const expectedBudget = expectedBudgetMap.get(budgetKey);
      
      if (!expectedBudget) {
        validationErrors.push({
          row: i + 2, // Excel row number
          field: 'Item',
          error: `${fileBudget.Item_Type} ID ${fileBudget.Item_ID} exists in Excel file but not in database. Please download a fresh template.`
        });
        continue;
      }

      // Validate each field matches
      const fieldsToValidate = [
        { fileField: 'Item_Name', dbValue: expectedBudget.Item_Name },
        { fileField: 'WBS_Code', dbValue: expectedBudget.WBS_Code },
        { fileField: 'Level', dbValue: expectedBudget.Level },
        { fileField: 'Current_Planned_Amount', dbValue: expectedBudget.Current_Planned_Amount },
        { fileField: 'Current_Actual_Amount', dbValue: expectedBudget.Current_Actual_Amount },
        { fileField: 'Current_Variance', dbValue: expectedBudget.Current_Variance }
      ];

      for (const field of fieldsToValidate) {
        let fileValue = (fileBudget as any)[field.fileField];
        let dbValue = field.dbValue;

        // Handle null/empty values consistently
        if ((fileValue === '' || fileValue === null || fileValue === undefined) && 
            (dbValue === null || dbValue === undefined)) {
          continue; // Both are null/empty, this is OK
        }

        // Special handling for different field types
        if (field.fileField === 'WBS_Code') {
          // Normalize both values: treat null, undefined, and empty string as equivalent
          const normalizeCode = (value: any) => {
            if (value === null || value === undefined || value === '') {
              return '';
            }
            return String(value).trim();
          };
          
          fileValue = normalizeCode(fileValue);
          dbValue = normalizeCode(dbValue);
        } else if (field.fileField === 'Level' || field.fileField.includes('Amount') || field.fileField.includes('Variance')) {
          // Ensure numbers are compared as numbers with proper rounding
          fileValue = Number(Number(fileValue).toFixed(2));
          dbValue = Number(Number(dbValue).toFixed(2));
          
          if (fileValue !== dbValue) {
            validationErrors.push({
              row: i + 2,
              field: field.fileField,
              error: `Mismatch for ${fileBudget.Item_Type} ID ${fileBudget.Item_ID}: Excel has "${fileValue}", database has "${dbValue}". Please download a fresh template.`
            });
          }
          continue; // Skip string comparison for numbers
        } else {
          // Convert to string for comparison and normalize
          fileValue = String(fileValue === null || fileValue === undefined ? '' : fileValue).trim();
          dbValue = String(dbValue === null || dbValue === undefined ? '' : dbValue).trim();
        }

        if (fileValue !== dbValue) {
          validationErrors.push({
            row: i + 2,
            field: field.fileField,
            error: `Mismatch for ${fileBudget.Item_Type} ID ${fileBudget.Item_ID}: Excel has "${fileValue}", database has "${dbValue}". Please download a fresh template.`
          });
        }
      }
    }

    // Check for budget items in database that are missing from file
    for (const expectedBudget of expectedBudgetData) {
      const existsInFile = jsonData.some((fileBudget: any) => 
        fileBudget.Item_Type === expectedBudget.Item_Type && 
        fileBudget.Item_ID === expectedBudget.Item_ID
      );
      if (!existsInFile) {
        validationErrors.push({
          field: 'Missing Budget Item',
          error: `${expectedBudget.Item_Type} ID ${expectedBudget.Item_ID} "${expectedBudget.Item_Name}" exists in database but is missing from Excel file. Please download a fresh template.`
        });
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Security validation failed: Existing budget data mismatch',
        details: 'The existing budget data in your Excel file does not match the current database state. This could indicate the template is outdated or has been modified.',
        message: `Found ${validationErrors.length} mismatch(es) in existing budget data:\n\n${validationErrors.map(err => `• ${err.field}: ${err.error}`).join('\n')}\n\nPlease download a fresh template with the latest budget data and try again.`,
        validationErrors,
        errorType: 'SECURITY_VALIDATION_ERROR',
        recommendation: 'Download a fresh budget template to ensure you have the latest existing budget data, then transfer your new budget amounts to the fresh template.'
      }, { status: 400 });
    }

    // ===== END SECURITY VALIDATION =====

    // Process the data
    const results = {
      updated_budgets: [] as any[],
      created_budgets: [] as any[],
      errors: [] as any[],
      warnings: [] as any[],
      summary: {
        total_processed: 0,
        successful: 0,
        failed: 0,
        warnings: 0,
        total_budget_change: 0,
      },
    };

    let totalBudgetChange = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Account for header row

      try {
        results.summary.total_processed++;

        // Skip rows without new planned amount or where it's empty
        if (
          row.New_Planned_Amount === undefined ||
          row.New_Planned_Amount === null ||
          row.New_Planned_Amount === "" ||
          (typeof row.New_Planned_Amount === "string" && row.New_Planned_Amount.trim() === "") ||
          isNaN(Number(row.New_Planned_Amount))
        ) {
          continue; // Skip this row
        }

        const newPlannedAmount = Number(row.New_Planned_Amount);

        // Validate new planned amount
        if (newPlannedAmount < 0) {
          results.errors.push({
            row: rowNum,
            field: "New_Planned_Amount",
            error: "Amount cannot be negative",
            item_name: row.Item_Name,
          });
          results.summary.failed++;
          continue;
        }

        // Skip root WBS items (level 0)
        if (row.Item_Type === "WBS" && row.Level === 0) {
          results.warnings.push({
            row: rowNum,
            message: "Root WBS budget cannot be edited through template",
            item_name: row.Item_Name,
          });
          results.summary.warnings++;
          continue;
        }

        // Validate item exists
        let itemExists = false;
        let itemName = "";

        if (row.Item_Type === "WBS") {
          const wbs = await prisma.wBS.findFirst({
            where: {
              wbs_id: row.Item_ID,
              project_id: projectId,
            },
          });
          itemExists = !!wbs;
          itemName = wbs?.name || "";
        } else if (row.Item_Type === "Task") {
          const task = await prisma.task.findFirst({
            where: {
              task_id: row.Item_ID,
              wbs: { project_id: projectId },
            },
            include: { wbs: true },
          });
          itemExists = !!task;
          itemName = task?.name || "";
        }

        if (!itemExists) {
          results.errors.push({
            row: rowNum,
            field: "Item_ID",
            error: `${row.Item_Type} with ID ${row.Item_ID} not found`,
            item_name: row.Item_Name,
          });
          results.summary.failed++;
          continue;
        }

        // Find existing budget
        const budgetQuery = {
          where: {
            project_id: projectId,
            ...(row.Item_Type === "WBS"
              ? { wbs_id: row.Item_ID }
              : { task_id: row.Item_ID }),
          },
        };

        // Find existing budgets (there might be multiple)
        const existingBudgets = await prisma.budget.findMany({
          where: {
            project_id: projectId,
            ...(row.Item_Type === "WBS"
              ? { wbs_id: row.Item_ID }
              : { task_id: row.Item_ID }),
          },
        });

        // Calculate current total planned amount
        const currentTotalPlanned = existingBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
        const budgetChange = newPlannedAmount - currentTotalPlanned;
        totalBudgetChange += budgetChange;

        if (existingBudgets.length > 0) {
          // Update the first existing budget to the new amount, delete others
          const firstBudget = existingBudgets[0];
          const otherBudgets = existingBudgets.slice(1);

          // Delete other budget records for this item
          if (otherBudgets.length > 0) {
            await prisma.budget.deleteMany({
              where: {
                budget_id: {
                  in: otherBudgets.map(b => b.budget_id)
                }
              }
            });
          }

          // Update the first budget
          const updatedBudget = await prisma.budget.update({
            where: { budget_id: firstBudget.budget_id },
            data: {
              planned_amount: newPlannedAmount,
              variance: newPlannedAmount - firstBudget.actual_amount,
              updated_at: new Date(),
            },
          });

          results.updated_budgets.push({
            budget_id: updatedBudget.budget_id,
            wbs_id: row.Item_Type === "WBS" ? row.Item_ID : undefined,
            task_id: row.Item_Type === "Task" ? row.Item_ID : undefined,
            wbs_name: row.Item_Type === "WBS" ? itemName : undefined,
            task_name: row.Item_Type === "Task" ? itemName : undefined,
            old_planned_amount: currentTotalPlanned,
            new_planned_amount: newPlannedAmount,
            variance: updatedBudget.variance,
            status: "updated",
          });
        } else {
          // Create new budget
          const newBudget = await prisma.budget.create({
            data: {
              project_id: projectId,
              ...(row.Item_Type === "WBS"
                ? { wbs_id: row.Item_ID }
                : { task_id: row.Item_ID }),
              cost_type: row.Item_Type === "WBS" ? "WBS_TEMPLATE" : "TASK_TEMPLATE",
              planned_amount: newPlannedAmount,
              actual_amount: 0,
              variance: newPlannedAmount,
              fiscal_year: new Date().getFullYear(),
              fiscal_period: "1",
            },
          });

          results.created_budgets.push({
            budget_id: newBudget.budget_id,
            wbs_id: row.Item_Type === "WBS" ? row.Item_ID : undefined,
            task_id: row.Item_Type === "Task" ? row.Item_ID : undefined,
            wbs_name: row.Item_Type === "WBS" ? itemName : undefined,
            task_name: row.Item_Type === "Task" ? itemName : undefined,
            planned_amount: newPlannedAmount,
            variance: newPlannedAmount,
            status: "created",
          });
        }

        results.summary.successful++;
      } catch (error: any) {
        console.error(`Error processing row ${rowNum}:`, error);
        results.errors.push({
          row: rowNum,
          field: "general",
          error: error.message || "Unknown error occurred",
          item_name: row.Item_Name,
        });
        results.summary.failed++;
      }
    }

    results.summary.total_budget_change = totalBudgetChange;

    return NextResponse.json({
      message: "Budget template processed successfully",
      ...results,
    });
  } catch (error: any) {
    console.error("Error processing budget template:", error);
    return NextResponse.json(
      {
        error: "Failed to process budget template",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
