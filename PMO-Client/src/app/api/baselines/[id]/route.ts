import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/baselines/{id}:
 *   get:
 *     summary: Get a baseline by ID
 *     description: Retrieves a specific baseline by its ID
 *     tags:
 *       - Baselines
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the baseline to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baseline retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 baseline_id:
 *                   type: integer
 *                 project_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 baseline_date:
 *                   type: string
 *                   format: date-time
 *                 baseline_type:
 *                   type: string
 *                 scope_snapshot:
 *                   type: string
 *                 schedule_snapshot:
 *                   type: string
 *                 cost_snapshot:
 *                   type: string
 *                 project:
 *                   type: object
 *                 creator:
 *                   type: object
 *       404:
 *         description: Baseline not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  try {
    const baselineId = parseInt(id);

    const baseline = await prisma.baseline.findUnique({
      where: {
        baseline_id: baselineId,
      },
      include: {
        project: true,
        creator: true,
      },
    });

    if (!baseline) {
      return NextResponse.json({ error: "Baseline not found" }, { status: 404 });
    }

    return NextResponse.json(baseline);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch baseline" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/baselines/{id}:
 *   patch:
 *     summary: Update a baseline
 *     description: Updates an existing baseline by ID
 *     tags:
 *       - Baselines
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the baseline to update
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
 *                 description: Name of the baseline
 *               description:
 *                 type: string
 *                 description: Description of what this baseline represents
 *               baseline_type:
 *                 type: string
 *                 description: Type of baseline (e.g., Initial, Re-baseline)
 *     responses:
 *       200:
 *         description: Baseline updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 baseline_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Baseline not found
 *       500:
 *         description: Server error
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  try {
    const baselineId = parseInt(id);
    const data = await req.json();

    // Check if baseline exists
    const existingBaseline = await prisma.baseline.findUnique({
      where: {
        baseline_id: baselineId,
      },
    });

    if (!existingBaseline) {
      return NextResponse.json({ error: "Baseline not found" }, { status: 404 });
    }

    // Update only allowed fields
    const updatedBaseline = await prisma.baseline.update({
      where: {
        baseline_id: baselineId,
      },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        description: data.description !== undefined ? data.description : undefined,
        baseline_type: data.baseline_type !== undefined ? data.baseline_type : undefined,
      },
    });

    return NextResponse.json(updatedBaseline);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update baseline" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/baselines/{id}:
 *   delete:
 *     summary: Delete a baseline
 *     description: Deletes a baseline by ID
 *     tags:
 *       - Baselines
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the baseline to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baseline deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Baseline deleted successfully
 *       404:
 *         description: Baseline not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  try {
    const baselineId = parseInt(id);

    // Check if baseline exists
    const existingBaseline = await prisma.baseline.findUnique({
      where: {
        baseline_id: baselineId,
      },
    });

    if (!existingBaseline) {
      return NextResponse.json({ error: "Baseline not found" }, { status: 404 });
    }

    // Delete the baseline
    await prisma.baseline.delete({
      where: {
        baseline_id: baselineId,
      },
    });

    return NextResponse.json({ message: "Baseline deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete baseline" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.project_id || !data.name || !data.description || 
        !data.baseline_date || !data.baseline_type || 
        !data.scope_snapshot || !data.schedule_snapshot || 
        !data.cost_snapshot || !data.created_by) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const newBaseline = await prisma.baseline.create({
      data: {
        project_id: data.project_id,
        name: data.name,
        description: data.description,
        baseline_date: new Date(data.baseline_date),
        baseline_type: data.baseline_type,
        scope_snapshot: data.scope_snapshot,
        schedule_snapshot: data.schedule_snapshot,
        cost_snapshot: data.cost_snapshot,
        created_by: data.created_by,
      },
      include: {
        project: true,
        creator: true,
      },
    });

    return NextResponse.json(newBaseline, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create baseline" }, { status: 400 });
  }
}