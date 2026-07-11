import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const resourceAssignments = await prisma.resourceAssignment.findMany({
      where: { task_id: parseInt(task_id) },
      include: {
        resource: true,
      },
    });

    return NextResponse.json(resourceAssignments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch resource assignments: " + (error as Error).message },
      { status: 500 }
    );
  }
} 