import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const wbsItems = await prisma.wBSItem.findMany({
      where: { wbs_id: parseInt(wbs_id) },
    });

    return NextResponse.json(wbsItems);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch WBS items: " + (error as Error).message },
      { status: 500 }
    );
  }
} 