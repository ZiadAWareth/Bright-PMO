import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import * as XLSX from 'xlsx';

/**
 * GET /api/projects/[id]/wbs/template/download-p6
 * Download P6 / MS Project style WBS template (level = 1, 1.1, 1.1.1; parent inferred).
 * Start/end dates and description optional.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await getUserFromHeaders();
    if (role !== 'PMO' && role !== 'ADMIN' && role !== 'PJM') {
      return NextResponse.json(
        { error: 'Unauthorized. Only PMO, ADMIN, or PJM can download templates.' },
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
      select: { project_id: true, project_code: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const wb = XLSX.utils.book_new();

    const instructions = [
      ['P6 / MS PROJECT WBS UPLOAD'],
      [''],
      ['Use this template or paste your Primavera P6 / Microsoft Project WBS export.'],
      [''],
      ['Required columns:'],
      ['  • WBS Level: hierarchy like 1, 1.1, 1.1.1 (parent is inferred)'],
      ['  • WBS Name: name of the WBS item'],
      [''],
      ['Optional: Weight % (column 3) — progress weight (e.g. 100.00%, 27.48%). Used when rolling up to project progress. Empty = equal share.'],
      ['Optional: Assigned Budget (column 4) — numeric planned amount for this WBS.'],
      ['Optional: Description, Start Date, End Date. If omitted, description defaults to name; dates are optional.'],
    ];
    const instSheet = XLSX.utils.aoa_to_sheet(instructions);
    instSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, instSheet, 'Instructions');

    const headers = ['WBS Level', 'WBS Name', 'Weight %', 'Assigned Budget', 'Description', 'Start Date', 'End Date'];
    const sample = [
      ['1', 'Project Phase 1', '100.00%', 120000, 'First phase', '2025-01-01', '2025-06-30'],
      ['1.1', 'Sub-phase A', '27.48%', 32976, '', '', ''],
      ['1.1.1', 'Activity A1', '17.04%', 20448, '', '', ''],
      ['1.1.2', 'Activity A2', '10.44%', 12528, '', '', ''],
      ['1.2', 'Sub-phase B', '', '', '', '', ''],
    ];
    const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    dataSheet['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, dataSheet, 'P6 WBS');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="WBS_P6_Template_${project.project_code}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('P6 WBS template download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate P6 WBS template' },
      { status: 500 }
    );
  }
}
