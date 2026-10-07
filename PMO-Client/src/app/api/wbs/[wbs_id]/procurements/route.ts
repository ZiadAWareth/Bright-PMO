import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_id } = resolvedParams;
    const procurements = await prisma.procurement.findMany({
      where: { wbs_id: parseInt(wbs_id) },
      include: {
        project: true,
        contracts: {
          include: {
            vendor: true
          }
        }
      },
    });

    return NextResponse.json(procurements);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch procurements: " + (error as Error).message },
      { status: 500 }
    );
  }
} 