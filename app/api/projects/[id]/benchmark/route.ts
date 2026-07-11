import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  // Fetch the project to get its type
  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    select: { type: true }
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Fetch the benchmark for this project type
  const benchmark = await prisma.benchmark.findUnique({
    where: { project_type: project.type }
  });

  if (!benchmark) {
    return NextResponse.json({ error: 'Benchmark not found for this project type' }, { status: 404 });
  }

  return NextResponse.json(benchmark);
} 