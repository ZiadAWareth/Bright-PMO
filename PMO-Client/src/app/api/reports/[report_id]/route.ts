import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/reports/{report_id}:
 *   get:
 *     summary: Get a report by ID
 *     description: Retrieves a specific report by its ID with creator information
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 type:
 *                   type: string
 *                 template:
 *                   type: object
 *                   description: JSON template data for the report
 *                 created_by:
 *                   type: integer
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 creator:
 *                   type: object
 *                   description: Creator user information
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ report_id: string }> }
) {
  const resolvedParams = await context.params;
  const { report_id } = resolvedParams;
  try {
    const report = await prisma.report.findUnique({
      where: { report_id: Number(report_id) },
      include: {
        creator: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/reports/{report_id}:
 *   put:
 *     summary: Update a report
 *     description: Updates an existing report by ID
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the report
 *               description:
 *                 type: string
 *                 description: Description of the report
 *               type:
 *                 type: string
 *                 description: Type of report
 *               template:
 *                 type: object
 *                 description: JSON template configuration for the report
 *               created_by:
 *                 type: integer
 *                 description: ID of the user creating the report
 *     responses:
 *       200:
 *         description: Report updated successfully
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
 *         description: Failed to update report
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ report_id: string }> }
) {
  const resolvedParams = await context.params;
  const { report_id } = resolvedParams;
  try {
    const data = await req.json();
    const updatedReport = await prisma.report.update({
      where: { report_id: Number(report_id) },
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

    return NextResponse.json(updatedReport);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update report" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/reports/{report_id}:
 *   delete:
 *     summary: Delete a report
 *     description: Deletes a report by ID
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Report deleted successfully
 *                 deletedReport:
 *                   type: object
 *       400:
 *         description: Failed to delete report
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ report_id: string }> }
) {
  const resolvedParams = await context.params;
  const { report_id } = resolvedParams;
  try {
    const deletedReport = await prisma.report.delete({
      where: { report_id: Number(report_id) },
    });

    return NextResponse.json({ message: "Report deleted successfully", deletedReport });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete report" }, { status: 400 });
  }
}
