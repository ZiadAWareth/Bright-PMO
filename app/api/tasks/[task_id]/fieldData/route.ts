import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Fetch all field data for a specific task
export async function GET(
  req: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { task_id } = resolvedParams;
    const fieldData = await prisma.fieldData.findMany({
      where: { task_id: parseInt(task_id) },
    });

    return NextResponse.json(fieldData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch field data: " + (error as Error).message },
      { status: 500 }
    );
  }
}
