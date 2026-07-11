import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * @swagger
 * /api/projects/{id}/budget/template/download:
 *   get:
 *     summary: Download budget template for bulk editing
 *     description: Downloads an Excel template with current budget data for bulk editing of WBS and task budgets
 *     tags:
 *       - Project Budget Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project
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
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: {
        project_id: true,
        name: true,
        project_code: true,
        budget_amount: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all WBS items for the project with their budgets and tasks
    const wbsItems = await prisma.wBS.findMany({
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

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare budget data
    const budgetData: any[] = [];
    const headers = [
      "Item_Type",
      "Item_ID",
      "Item_Name", 
      "WBS_Code",
      "Level",
      "Current_Planned_Amount",
      "Current_Actual_Amount",
      "Current_Variance",
      "New_Planned_Amount"
    ];

    budgetData.push(headers);

    // Add WBS items
    for (const wbs of wbsItems) {
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

      budgetData.push([
        "WBS",
        wbs.wbs_id,
        wbs.name,
        wbs.wbs_code,
        wbs.level,
        currentPlanned,
        currentActual,
        currentVariance,
        wbs.level === 0 ? "" : currentPlanned // Don't allow editing root WBS
      ]);

      // Add tasks for this WBS
      for (const task of wbs.tasks) {
        const taskBudgets = task.budgets.filter(b => b.task_id === task.task_id);
        
        const taskPlanned = taskBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
        const taskActual = taskBudgets.reduce((sum, b) => sum + b.actual_amount, 0);
        const taskVariance = taskBudgets.reduce((sum, b) => sum + b.variance, 0);

        budgetData.push([
          "Task",
          task.task_id,
          task.name,
          "",
          wbs.level + 1,
          taskPlanned,
          taskActual,
          taskVariance,
          taskPlanned
        ]);
      }
    }

    // Create budget data worksheet
    const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
    
    // Set column widths
    budgetWS['!cols'] = [
      { width: 10 }, // Item_Type
      { width: 10 }, // Item_ID
      { width: 30 }, // Item_Name
      { width: 15 }, // WBS_Code
      { width: 8 },  // Level
      { width: 18 }, // Current_Planned_Amount
      { width: 18 }, // Current_Actual_Amount
      { width: 18 }, // Current_Variance
      { width: 18 }, // New_Planned_Amount
    ];

    XLSX.utils.book_append_sheet(workbook, budgetWS, "Budget_Data");

    // Create instructions worksheet
    const instructions = [
      ["Budget Template Instructions"],
      [""],
      ["Overview:"],
      ["This template allows you to update planned budget amounts for WBS items and tasks in bulk."],
      ["Root WBS (Level 0) budgets cannot be edited through this template."],
      [""],
      ["How to use:"],
      ["1. Review current budget data in the Budget_Data sheet"],
      ["2. Enter new planned amounts in the 'New_Planned_Amount' column"],
      ["3. Leave cells blank if you don't want to change that item's budget"],
      ["4. Save the file and upload it back to the system"],
      [""],
      ["Field Descriptions:"],
      ["Item_Type: Whether this is a WBS item or Task"],
      ["Item_ID: Internal system ID (do not modify)"],
      ["Item_Name: Name of the WBS item or task"],
      ["WBS_Code: Code for WBS items (empty for tasks)"],
      ["Level: Hierarchy level (0=root, 1=sub-level, etc.)"],
      ["Current_Planned_Amount: Currently allocated budget"],
      ["Current_Actual_Amount: Amount actually spent"],
      ["Current_Variance: Difference between planned and actual"],
      ["New_Planned_Amount: YOUR INPUT - New budget amount"],
      [""],
      ["Important Notes:"],
      ["• Root WBS (Level 0) planned amounts cannot be changed"],
      ["• All amounts must be 0 or greater"],
      ["• Empty cells in New_Planned_Amount will be ignored"],
      ["• Changes take effect immediately upon upload"],
      ["• The system will recalculate variances automatically"],
      [""],
      ["Project Information:"],
      [`Project: ${project.name} (${project.project_code})`],
      [`Current Total Budget: OMR ${project.budget_amount?.toLocaleString() || '0'}`],
      [`Generated: ${new Date().toLocaleString()}`],
    ];

    const instructionsWS = XLSX.utils.aoa_to_sheet(instructions);
    instructionsWS['!cols'] = [{ width: 80 }];

    XLSX.utils.book_append_sheet(workbook, instructionsWS, "Instructions");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="budget_template_project_${projectId}_${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating budget template:", error);
    return NextResponse.json(
      { error: "Failed to generate budget template" },
      { status: 500 }
    );
  }
}
