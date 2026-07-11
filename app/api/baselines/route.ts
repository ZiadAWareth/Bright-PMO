// app/api/baselines/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/baselines:
 *   get:
 *     summary: Get all baselines
 *     description: Retrieves a list of all project baselines
 *     tags:
 *       - Baselines
 *     responses:
 *       200:
 *         description: List of baselines retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   baseline_id:
 *                     type: integer
 *                   project_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   baseline_date:
 *                     type: string
 *                     format: date-time
 *                   baseline_type:
 *                     type: string
 *                   scope_snapshot:
 *                     type: string
 *                   schedule_snapshot:
 *                     type: string
 *                   cost_snapshot:
 *                     type: string
 *                   created_by:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   project:
 *                     type: object
 *                   creator:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const baselines = await prisma.baseline.findMany({
      include: {
        project: true,
        creator: true,
      },
    });
    return NextResponse.json(baselines);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch baselines" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/baselines:
 *   post:
 *     summary: Create a new baseline
 *     description: Creates a new project baseline snapshot
 *     tags:
 *       - Baselines
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - name
 *               - description
 *               - baseline_date
 *               - baseline_type
 *               - scope_snapshot
 *               - schedule_snapshot
 *               - cost_snapshot
 *               - created_by
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: ID of the project this baseline belongs to
 *               name:
 *                 type: string
 *                 description: Name of the baseline
 *               description:
 *                 type: string
 *                 description: Description of what this baseline represents
 *               baseline_date:
 *                 type: string
 *                 format: date-time
 *                 description: Date when the baseline was taken
 *               baseline_type:
 *                 type: string
 *                 description: Type of baseline (e.g., Initial, Re-baseline)
 *               scope_snapshot:
 *                 type: string
 *                 description: JSON representation of the project scope at baseline time
 *               schedule_snapshot:
 *                 type: string
 *                 description: JSON representation of the project schedule at baseline time
 *               cost_snapshot:
 *                 type: string
 *                 description: JSON representation of the project cost at baseline time
 *               created_by:
 *                 type: integer
 *                 description: ID of the user who created the baseline
 *     responses:
 *       201:
 *         description: Baseline created successfully
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
 *       400:
 *         description: Missing required fields or other error
 *       500:
 *         description: Server error
 */
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