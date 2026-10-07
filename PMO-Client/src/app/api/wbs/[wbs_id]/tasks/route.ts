import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const tasks = await prisma.task.findMany({
      where: { wbs_id: parseInt(wbs_id) },
      include: {
        resourceAssignments: true,
        budgets: true,
        documents: true,
        predecessor_dependencies: true,
        successor_dependencies: true,
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks: " + (error as Error).message },
      { status: 500 }
    );
  }
} 