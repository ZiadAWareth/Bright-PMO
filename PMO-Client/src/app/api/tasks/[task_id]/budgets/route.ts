import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const budgets = await prisma.budget.findMany({
      where: { task_id: parseInt(task_id) },
      include: {
        project: true,
        wbs: true,
      },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch budgets: " + (error as Error).message },
      { status: 500 }
    );
  }
} 