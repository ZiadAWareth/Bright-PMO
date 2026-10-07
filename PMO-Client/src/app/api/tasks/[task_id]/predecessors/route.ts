import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const predecessors = await prisma.taskDependency.findMany({
      where: { successor_task_id: parseInt(task_id) },
      include: {
        predecessor: true,
      },
    });

    return NextResponse.json(predecessors);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch predecessors: " + (error as Error).message },
      { status: 500 }
    );
  }
} 