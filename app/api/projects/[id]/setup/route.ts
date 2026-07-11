import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch ProjectSetup for a project
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }
  try {
    const setup = await prisma.projectSetup.findUnique({ where: { project_id: projectId } });
    if (!setup) {
      return NextResponse.json({ error: 'Project setup not found' }, { status: 404 });
    }
    return NextResponse.json(setup);
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 });
  }
}

// POST: Create ProjectSetup for a project
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }
  try {
    const data = await req.json();
    const setup = await prisma.projectSetup.create({
      data: {
        project_id: projectId,
        wbs: data.wbs ?? false,
        schedule: data.schedule ?? false,
        budget: data.budget ?? false,
        team: data.team ?? false,
        risk: data.risk ?? false,
        baseline: data.baseline ?? false,
        execution: data.execution ?? false,
        off_days: data.off_days ?? [],
      },
    });
    return NextResponse.json(setup, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 });
  }
}

// PATCH: Update ProjectSetup for a project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }
  try {
    const data = await req.json();
    const current = await prisma.projectSetup.findUnique({ where: { project_id: projectId } });
    if (!current) {
      return NextResponse.json({ error: 'Project setup not found' }, { status: 404 });
    }
    // Step order
    const steps: (keyof typeof current)[] = [
      'wbs',
      'schedule',
      'budget',
      'team',
      'risk',
      'baseline',
      'execution',
    ];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Only enforce if the update is trying to set this step to true and it was previously false
      if (data[step] === true && !current[step]) {
        // Check all previous steps
        for (let j = 0; j < i; j++) {
          const prevStep = steps[j];
          // If the update payload sets a previous step to true, use that, otherwise use the current db value
          const prevValue = (typeof data[prevStep] === 'boolean') ? data[prevStep] : current[prevStep];
          if (!prevValue) {
            return NextResponse.json({ error: `Cannot complete '${step}' before '${prevStep}' is completed.` }, { status: 400 });
          }
        }
      }
    }
    const setup = await prisma.projectSetup.update({
      where: { project_id: projectId },
      data: {
        wbs: data.wbs,
        schedule: data.schedule,
        budget: data.budget,
        team: data.team,
        risk: data.risk,
        baseline: data.baseline,
        execution: data.execution,
        ...(data.off_days !== undefined && { off_days: data.off_days }),
      },
    });

    // If all fields are true, update project status
    if (
      setup.wbs &&
      setup.schedule &&
      setup.budget &&
      setup.team &&
      setup.risk &&
      setup.baseline &&
      setup.execution
    ) {
      await prisma.project.update({
        where: { project_id: projectId },
        data: { status: 'pending_approval' },
      });
    }

    return NextResponse.json(setup);
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 });
  }
} 