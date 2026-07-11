import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { processP6WBSFile } from '@/lib/wbs-p6-utils';
import type { P6WBSRow } from '@/lib/wbs-p6-utils';
import { weightedProgressAverage } from '@/lib/wbs-progress-utils';

/** Pre-calculated insert spec: parent and dates resolved before the transaction. */
interface InsertSpec {
  row: P6WBSRow;
  /** null = use project root; number = batch index of parent (validated < current index). */
  parentBatchIndex: number | null;
  startDate: Date | null;
  endDate: Date | null;
}

type ValidationIssue = { row: number; field: string; error: string };

class UploadValidationError extends Error {
  issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'UploadValidationError';
    this.issues = issues;
  }
}

/**
 * POST /api/projects/[id]/wbs/template/upload-p6
 * Upload WBS from P6 / MS Project style Excel (level = 1, 1.1, 1.1.1; parent inferred).
 * No Existing WBS sheet. Start/end dates and description optional (description defaults to name).
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await getUserFromHeaders();
    if (role !== 'PMO' && role !== 'ADMIN' && role !== 'PJM') {
      return NextResponse.json(
        { error: 'Unauthorized. Only PMO, ADMIN, or PJM can upload templates.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const projectId = parseInt(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: {
        project_id: true,
        name: true,
        project_code: true,
        start_date: true,
        planned_end_date: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Use Excel (.xlsx or .xls).' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { data: wbsData, errors: processingErrors } = processP6WBSFile(buffer);

    if (processingErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'P6 file validation failed',
          errors: processingErrors,
          errorType: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (wbsData.length === 0) {
      return NextResponse.json(
        { error: 'No WBS rows found in file. Need columns for level (e.g. 1, 1.1) and name.' },
        { status: 400 }
      );
    }

    const projectRoot = await prisma.wBS.findFirst({
      where: { project_id: projectId, level: 0 },
      select: { wbs_id: true },
    });

    const projectStart = project.start_date ? new Date(project.start_date) : null;
    const projectEnd = project.planned_end_date ? new Date(project.planned_end_date) : null;

    // Pre-calculate insert specs and validate parents (no DB work).
    const errors: { row: number; field: string; error: string }[] = [];
    const insertSpecs: InsertSpec[] = [];
    for (let i = 0; i < wbsData.length; i++) {
      const row = wbsData[i];
      const parentBatchIndex = row.parent_row_index;
      if (parentBatchIndex != null) {
        if (parentBatchIndex < 0 || parentBatchIndex >= i) {
          errors.push({
            row: row.rowNumber,
            field: 'Parent',
            error: `Parent row not found for level ${row.level}. Ensure rows are ordered (e.g. 1, then 1.1, then 1.1.1).`,
          });
          continue;
        }
      }
      const startDate = row.start_date ? new Date(row.start_date) : projectStart;
      const endDate = row.end_date ? new Date(row.end_date) : projectEnd;
      if (row.assigned_budget != null && row.assigned_budget < 0) {
        errors.push({
          row: row.rowNumber,
          field: 'Assigned Budget',
          error: 'Assigned Budget must be greater than or equal to 0.',
        });
        continue;
      }
      insertSpecs.push({ row, parentBatchIndex, startDate, endDate });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'P6 file validation failed',
          errors,
          errorType: 'VALIDATION_ERROR',
          summary: {
            total_processed: wbsData.length,
            successful: 0,
            failed: errors.length,
          },
        },
        { status: 400 }
      );
    }

    // Transaction: atomic create of WBS + optional budgets.
    const createdWBSItems = await prisma.$transaction(
      async (tx) => {
        const createdWBSItems: { wbs_id: number; name: string; wbs_code: string; level: number; parent_wbs_id: number | null; status: string }[] = [];
        const createdByIndex = new Map<number, number>(); // batch index -> wbs_id
        const budgetIssues: ValidationIssue[] = [];

        for (let i = 0; i < insertSpecs.length; i++) {
          const spec = insertSpecs[i];
          const parent_wbs_id =
            spec.parentBatchIndex === null
              ? projectRoot?.wbs_id ?? null
              : (createdByIndex.get(spec.parentBatchIndex) ?? null);

          const wbsCode = spec.row.level_string;
          const created = await tx.wBS.create({
            data: {
              project_id: projectId,
              parent_wbs_id,
              name: spec.row.name,
              description: spec.row.description || spec.row.name,
              level: spec.row.level,
              start_date: spec.startDate ?? undefined,
              end_date: spec.endDate ?? undefined,
              progress_percentage: 0,
              ...(spec.row.progress_weight != null && !isNaN(spec.row.progress_weight) && {
                progress_weight: spec.row.progress_weight,
              }),
              status: 'not_started',
              wbs_code: wbsCode,
            },
          });

          createdByIndex.set(i, created.wbs_id);
          createdWBSItems.push({
            wbs_id: created.wbs_id,
            name: created.name,
            wbs_code: created.wbs_code,
            level: created.level,
            parent_wbs_id: created.parent_wbs_id,
            status: created.status,
          });

          if (spec.row.assigned_budget != null) {
            const plannedAmount = spec.row.assigned_budget;
            if (parent_wbs_id != null) {
              const parentBudgetAgg = await tx.budget.aggregate({
                where: { project_id: projectId, wbs_id: parent_wbs_id },
                _sum: { planned_amount: true },
              });
              const parentPlannedTotal = parentBudgetAgg._sum.planned_amount ?? 0;

              const childBudgetAgg = await tx.budget.aggregate({
                where: {
                  project_id: projectId,
                  wbs: { is: { parent_wbs_id } },
                },
                _sum: { planned_amount: true },
              });
              const currentChildrenTotal = childBudgetAgg._sum.planned_amount ?? 0;
              const newChildrenTotal = currentChildrenTotal + plannedAmount;

              if (newChildrenTotal > parentPlannedTotal) {
                budgetIssues.push({
                  row: spec.row.rowNumber,
                  field: 'Assigned Budget',
                  error: `Budget validation failed: children total (${newChildrenTotal.toLocaleString()}) would exceed parent budget (${parentPlannedTotal.toLocaleString()}).`,
                });
                continue;
              }
            }

            await tx.budget.create({
              data: {
                project_id: projectId,
                wbs_id: created.wbs_id,
                task_id: null,
                cost_type: 'General',
                planned_amount: plannedAmount,
                actual_amount: 0,
                variance: 0,
                threshold: 0,
                fiscal_year: new Date().getFullYear(),
                fiscal_period: 'Q1',
              },
            });
          }
        }

        if (budgetIssues.length > 0) {
          throw new UploadValidationError('Budget validation failed', budgetIssues);
        }

        return createdWBSItems;
      },
      { timeout: 120000, maxWait: 10000 }
    );

    if (createdWBSItems.length > 0) {
      try {
        const rootWBSList = await prisma.wBS.findMany({
          where: { project_id: projectId, parent_wbs_id: null },
          select: { progress_percentage: true, progress_weight: true },
        });
        if (rootWBSList.length > 0) {
          const rootItems = rootWBSList.map((w) => ({
            progress: w.progress_percentage,
            weight: w.progress_weight ?? null,
          }));
          const projectProgress = weightedProgressAverage(rootItems);
          await prisma.project.update({
            where: { project_id: projectId },
            data: { progress_percentage: projectProgress },
          });
        }
      } catch {
        // ignore progress update failure
      }
    }

    return NextResponse.json({
      message: `${createdWBSItems.length} WBS items created`,
      created_wbs_items: createdWBSItems,
      summary: {
        total_processed: wbsData.length,
        successful: createdWBSItems.length,
        failed: 0,
      },
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          errors: error.issues,
          errorType: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }
    console.error('P6 WBS upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process P6 WBS upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
