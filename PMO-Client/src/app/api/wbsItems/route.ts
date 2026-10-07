import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/wbsItems:
 *   get:
 *     summary: Get all WBS items
 *     description: Retrieves a list of all WBS items with their associated WBS details
 *     tags:
 *       - WBS Items
 *     responses:
 *       200:
 *         description: List of WBS items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   wbs_item_id:
 *                     type: integer
 *                   wbs_id:
 *                     type: integer
 *                   wbs_item_code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *                   budget_amount:
 *                     type: number
 *                     format: float
 *                   actual_cost:
 *                     type: number
 *                     format: float
 *                   progress_percentage:
 *                     type: number
 *                     format: float
 *                   wbs:
 *                     type: object
 *                     description: Associated WBS details
 *       500:
 *         description: Server error
 */
// GET all WBS Items
export async function GET() {
  try {
    const wbsItems = await prisma.wBSItem.findMany({
      include: {
        wbs: true,
      },
    });
    return NextResponse.json(wbsItems);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch WBS items: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/wbsItems:
 *   post:
 *     summary: Create a new WBS item
 *     description: Creates a new WBS item with the provided details
 *     tags:
 *       - WBS Items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wbs_item_code
 *               - name
 *               - wbs_id
 *               - start_date
 *               - end_date
 *               - budget_amount
 *               - actual_cost
 *               - progress_percentage
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
 *       201:
 *         description: WBS item created successfully
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
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
// POST new WBS Item
export async function POST(req: Request) {
  try {
    const { wbs_item_code, name, wbs_id, start_date, end_date, budget_amount, actual_cost, progress_percentage } = await req.json();

    if (!wbs_item_code || !name || !wbs_id || !start_date || !end_date || budget_amount === undefined || actual_cost === undefined || progress_percentage === undefined) {
      return NextResponse.json(
        { error: 'All fields are required: wbs_item_code, name, wbs_id, start_date, end_date, budget_amount, actual_cost, progress_percentage' },
        { status: 400 }
      );
    }

    const newWBSItem = await prisma.wBSItem.create({
      data: {
        wbs_item_code,
        name,
        wbs_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        budget_amount,
        actual_cost,
        progress_percentage,
      },
    });

    return NextResponse.json(newWBSItem, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create WBS item: ' + (error as Error).message },
      { status: 500 }
    );
  }
}