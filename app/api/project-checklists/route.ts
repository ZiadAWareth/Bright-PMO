import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// GET all checklists or filter by project_id
export async function GET(req: NextRequest) {
  try {

    const checklists = await prisma.projectChecklist.findMany({
      include: {
        project: {
          select: {
            name: true,
            project_code: true,
          },
        },
        submitter: {
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        approver: {
          select: {
            account: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error("Error fetching checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
} 