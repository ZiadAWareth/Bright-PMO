import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const budgets = await prisma.budget.findMany({
      where: { wbs_id: parseInt(wbs_id) },
      include: {
        project: true,
        task: true,
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