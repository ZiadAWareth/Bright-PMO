import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     description: Retrieves a list of all reports with creator information
 *     tags:
 *       - Reports
 *     responses:
 *       200:
 *         description: List of reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   report_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   type:
 *                     type: string
 *                   template:
 *                     type: object
 *                     description: JSON template data for the report
 *                   created_by:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   creator:
 *                     type: object
 *                     description: Creator user information
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      include: {
        creator: true,
      },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     description: Creates a new report. Special handling for executive_summary type reports which auto-generates monthly summaries.
 *     tags:
 *       - Reports
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - template
 *               - created_by
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the report
 *               description:
 *                 type: string
 *                 description: Description of the report
 *               type:
 *                 type: string
 *                 description: Type of report (e.g., executive_summary, project_status, budget_analysis)
 *               template:
 *                 type: object
 *                 description: JSON template configuration for the report
 *               created_by:
 *                 type: integer
 *                 description: ID of the user creating the report
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *       400:
 *         description: Missing required fields or other error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.name || !data.type || !data.template || !data.created_by) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    if (data.type === "executive_summary") { // flag for workflow 19
      // everything we need for the executive summary report here

      const currentDate = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const month = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      
      const newReport = await prisma.report.create({
        data: {
          name: `Monthly Executive Summary - ${month} ${year}`,
          description: "Monthly Executive Summary",
          type: "executive_summary",
          template: {
        x: "anything",
        y: "anything",
        z: "anything",
        a: "anything",
          },
          created_by: data.created_by, // should be created by the system
        },
        include: {
          creator: true,
        },
      });
      return NextResponse.json(newReport, { status: 201 });
    }

    const newReport = await prisma.report.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        template: data.template,
        created_by: data.created_by,
      },
      include: {
        creator: true,
      },
    });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 400 });
  }
}
