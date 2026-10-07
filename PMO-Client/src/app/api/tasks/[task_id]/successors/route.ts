import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const successors = await prisma.taskDependency.findMany({
      where: { predecessor_task_id: parseInt(task_id) },
      include: {
        successor: true,
      },
    });

    return NextResponse.json(successors);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch successors: " + (error as Error).message },
      { status: 500 }
    );
  }
} 