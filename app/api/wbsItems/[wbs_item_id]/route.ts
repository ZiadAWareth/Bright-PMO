import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/wbsItems/{wbs_item_id}:
 *   get:
 *     summary: Get a WBS item by ID
 *     description: Retrieves a specific WBS item by its ID with associated WBS details
 *     tags:
 *       - WBS Items
 *     parameters:
 *       - in: path
 *         name: wbs_item_id
 *         required: true
 *         description: ID of the WBS item to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: WBS item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wbs_item_id:
 *                   type: integer
 *                 wbs_id:
 *                   type: integer
 *                 wbs_item_code:
 *                   type: string
 *                 name:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 end_date:
 *                   type: string
 *                   format: date
 *                 budget_amount:
 *                   type: number
 *                   format: float
 *                 actual_cost:
 *                   type: number
 *                   format: float
 *                 progress_percentage:
 *                   type: number
 *                   format: float
 *                 wbs:
 *                   type: object
 *                   description: Associated WBS details
 *       404:
 *         description: WBS item not found
 *       500:
 *         description: Server error
 */
// GET single WBS Item by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ wbs_item_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_item_id } = resolvedParams;
    const wbsItem = await prisma.wBSItem.findUnique({
      where: { wbs_item_id: parseInt(wbs_item_id) },
      include: {
        wbs: true,
      },
    });

    if (!wbsItem) {
      return NextResponse.json(
        { error: "WBS Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(wbsItem);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch WBS item: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/wbsItems/{wbs_item_id}:
 *   put:
 *     summary: Update a WBS item
 *     description: Updates an existing WBS item by ID
 *     tags:
 *       - WBS Items
 *     parameters:
 *       - in: path
 *         name: wbs_item_id
 *         required: true
 *         description: ID of the WBS item to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               wbs_item_code:
 *                 type: string
 *                 description: Unique code for the WBS item
 *               name:
 *                 type: string
 *                 description: Name of the WBS item
 *               wbs_id:
 *                 type: integer
 *                 description: ID of the WBS this item belongs to
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the WBS item
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: End date of the WBS item
 *               budget_amount:
 *                 type: number
 *                 format: float
 *                 description: Budgeted amount for the WBS item
 *               actual_cost:
 *                 type: number
 *                 format: float
 *                 description: Actual cost incurred for the WBS item
 *               progress_percentage:
 *                 type: number
 *                 format: float
 *                 description: Progress percentage of the WBS item
 *     responses:
 *       200:
 *         description: WBS item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wbs_item_id:
 *                   type: integer
 *                 wbs_item_code:
 *                   type: string
 *                 name:
 *                   type: string
 *       500:
 *         description: Server error
 */
// PUT update WBS Item
export async function PUT(
  req: Request,
  context: { params: Promise<{ wbs_item_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_item_id } = resolvedParams;
    const data = await req.json();
    const updatedWBSItem = await prisma.wBSItem.update({
      where: { wbs_item_id: parseInt(wbs_item_id) },
      data,
    });

    return NextResponse.json(updatedWBSItem);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update WBS item: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/wbsItems/{wbs_item_id}:
 *   delete:
 *     summary: Delete a WBS item
 *     description: Deletes a WBS item by ID
 *     tags:
 *       - WBS Items
 *     parameters:
 *       - in: path
 *         name: wbs_item_id
 *         required: true
 *         description: ID of the WBS item to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: WBS item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: WBS Item deleted successfully
 *       500:
 *         description: Server error
 */
// DELETE WBS Item
export async function DELETE(
  req: Request,
  context: { params: Promise<{ wbs_item_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { wbs_item_id } = resolvedParams;
    await prisma.wBSItem.delete({
      where: { wbs_item_id: parseInt(wbs_item_id) },
    });

    return NextResponse.json(
      { message: "WBS Item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete WBS item: " + (error as Error).message },
      { status: 500 }
    );
  }
} 