import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: Get all contracts
 *     description: Retrieves a list of all contracts
 *     tags:
 *       - Contracts
 *     responses:
 *       200:
 *         description: List of contracts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   contract_id:
 *                     type: integer
 *                   procurement_id:
 *                     type: integer
 *                   vendor_id:
 *                     type: integer
 *                   contract_number:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                   value:
 *                     type: number
 *                     format: float
 *                   status:
 *                     type: string
 *                   procurement:
 *                     type: object
 *                   vendor:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        procurement: true,
        vendor: true,
      },
    });
    return NextResponse.json(contracts);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     description: Creates a new contract with the provided details
 *     tags:
 *       - Contracts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - procurement_id
 *               - vendor_id
 *               - contract_number
 *               - name
 *               - description
 *               - start_date
 *               - end_date
 *               - value
 *             properties:
 *               procurement_id:
 *                 type: integer
 *                 description: ID of the related procurement
 *               vendor_id:
 *                 type: integer
 *                 description: ID of the vendor
 *               contract_number:
 *                 type: string
 *                 description: Unique contract reference number
 *               name:
 *                 type: string
 *                 description: Name of the contract
 *               description:
 *                 type: string
 *                 description: Description of the contract
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Start date of the contract
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: End date of the contract
 *               value:
 *                 type: number
 *                 format: float
 *                 description: Monetary value of the contract
 *               status:
 *                 type: string
 *                 description: Current status of the contract (e.g., Active, Completed, Terminated)
 *     responses:
 *       201:
 *         description: Contract created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contract_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 value:
 *                   type: number
 *                   format: float
 *       400:
 *         description: Missing required fields or other error
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.procurement_id || !data.vendor_id || !data.contract_number || 
        !data.name || !data.description || !data.start_date || 
        !data.end_date || data.value === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const newContract = await prisma.contract.create({
      data: {
        procurement_id: data.procurement_id,
        vendor_id: data.vendor_id,
        contract_number: data.contract_number,
        name: data.name,
        description: data.description,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        value: data.value,
        status: data.status,
      },
      include: {
        procurement: true,
        vendor: true,
      },
    });

    return NextResponse.json(newContract, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 400 });
  }
}
