import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/contracts/{contracts_id}:
 *   get:
 *     summary: Get a contract by ID
 *     description: Retrieves a specific contract by its ID with related procurement and vendor information
 *     tags:
 *       - Contracts
 *     parameters:
 *       - in: path
 *         name: contracts_id
 *         required: true
 *         description: ID of the contract to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contract_id:
 *                   type: integer
 *                 procurement_id:
 *                   type: integer
 *                 vendor_id:
 *                   type: integer
 *                 contract_number:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 end_date:
 *                   type: string
 *                   format: date
 *                 value:
 *                   type: number
 *                   format: float
 *                 status:
 *                   type: string
 *                 procurement:
 *                   type: object
 *                   description: Associated procurement details
 *                 vendor:
 *                   type: object
 *                   description: Associated vendor details
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ contracts_id: string }> }
) {
  const resolvedParams = await params;
  try {
    const contract = await prisma.contract.findUnique({
      where: { contract_id: Number(resolvedParams.contracts_id) },
      include: {
        procurement: true,
        vendor: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/contracts/{contracts_id}:
 *   put:
 *     summary: Update a contract
 *     description: Updates an existing contract by ID
 *     tags:
 *       - Contracts
 *     parameters:
 *       - in: path
 *         name: contracts_id
 *         required: true
 *         description: ID of the contract to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               procurement_id:
 *                 type: integer
 *                 description: ID of the associated procurement
 *               vendor_id:
 *                 type: integer
 *                 description: ID of the vendor
 *               contract_number:
 *                 type: string
 *                 description: Contract number
 *               name:
 *                 type: string
 *                 description: Name of the contract
 *               description:
 *                 type: string
 *                 description: Description of the contract
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Contract start date
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Contract end date
 *               value:
 *                 type: number
 *                 format: float
 *                 description: Contract value
 *               status:
 *                 type: string
 *                 description: Contract status
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contract_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Failed to update contract
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ contracts_id: string }> }
) {
  const resolvedParams = await params;
  try {
    const data = await req.json();
    const updatedContract = await prisma.contract.update({
      where: { contract_id: Number(resolvedParams.contracts_id) },
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

    return NextResponse.json(updatedContract);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update contract" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/contracts/{contracts_id}:
 *   delete:
 *     summary: Delete a contract
 *     description: Deletes a contract by ID
 *     tags:
 *       - Contracts
 *     parameters:
 *       - in: path
 *         name: contracts_id
 *         required: true
 *         description: ID of the contract to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contract deleted successfully
 *                 deletedContract:
 *                   type: object
 *                   description: The deleted contract
 *       400:
 *         description: Failed to delete contract
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contracts_id: string }> }
) {
  const resolvedParams = await params;
  try {
    const deletedContract = await prisma.contract.delete({
      where: { contract_id: Number(resolvedParams.contracts_id) },
    });

    return NextResponse.json({ message: "Contract deleted successfully", deletedContract });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/contracts/{contracts_id}:
 *   patch:
 *     summary: Approve a contract
 *     description: Approves a contract and assigns a unique contract number
 *     tags:
 *       - Contracts
 *     parameters:
 *       - in: path
 *         name: contracts_id
 *         required: true
 *         description: ID of the contract to approve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contract approved and contract number assigned.
 *                 contract:
 *                   type: object
 *                   properties:
 *                     contract_id:
 *                       type: integer
 *                     contract_number:
 *                       type: string
 *                       example: CT-2025-00012
 *                     status:
 *                       type: string
 *                       example: Approved
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Server error
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ contracts_id: string }> }
) {
  const resolvedParams = await params;
  const contractId = parseInt(resolvedParams.contracts_id);
  

  try {
    // 1. Fetch existing contract
    const contract = await prisma.contract.findUnique({
      where: { contract_id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found.' },
        { status: 404 }
      );
    }
    // 2. Generate a unique contract number (e.g., CT-2025-00012)
    const year = new Date().getFullYear();
    const contractNumber = `CT-${year}-${contractId.toString().padStart(5, '0')}`;

    // 3. Update the contract (approve + assign number)
    const updatedContract = await prisma.contract.update({
      where: { contract_id: contractId },
      data: {
        status: 'Approved',
        contract_number: contractNumber,
      },
    });

    // 4. Simulate legal notification

    // 5. Return updated contract
    return NextResponse.json(
      {
        message: 'Contract approved and contract number assigned.',
        contract: updatedContract,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving contract:', error);
    return NextResponse.json(
      { error: 'Failed to approve contract.' },
      { status: 500 }
    );
  }
}

