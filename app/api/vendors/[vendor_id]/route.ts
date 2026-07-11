// app/api/vendors/[vendor_id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/vendors/{vendor_id}:
 *   get:
 *     summary: Get a vendor by ID
 *     description: Retrieves a specific vendor by its ID with associated contracts
 *     tags:
 *       - Vendors
 *     parameters:
 *       - in: path
 *         name: vendor_id
 *         required: true
 *         description: ID of the vendor to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendor_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 contact_person:
 *                   type: string
 *                 contact_info:
 *                   type: string
 *                 address:
 *                   type: string
 *                 category:
 *                   type: string
 *                 performance_rating:
 *                   type: number
 *                   format: float
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 contracts:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ vendor_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { vendor_id } = resolvedParams;
    const vendor = await prisma.vendor.findUnique({
      where: { vendor_id: Number(vendor_id) },
      include: {
        contracts: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/vendors/{vendor_id}:
 *   put:
 *     summary: Update a vendor
 *     description: Updates an existing vendor by ID
 *     tags:
 *       - Vendors
 *     parameters:
 *       - in: path
 *         name: vendor_id
 *         required: true
 *         description: ID of the vendor to update
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
 *                 description: Name of the vendor
 *               contact_person:
 *                 type: string
 *                 description: Primary contact person at the vendor
 *               contact_info:
 *                 type: string
 *                 description: Contact information (email, phone, etc.)
 *               address:
 *                 type: string
 *                 description: Vendor's address
 *               category:
 *                 type: string
 *                 description: Category or type of vendor
 *               performance_rating:
 *                 type: number
 *                 format: float
 *                 description: Performance rating
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendor_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 category:
 *                   type: string
 *       400:
 *         description: Failed to update vendor
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ vendor_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { vendor_id } = resolvedParams;
    const data = await req.json();
    const updatedVendor = await prisma.vendor.update({
      where: { vendor_id: Number(vendor_id) },
      data: {
        name: data.name,
        contact_person: data.contact_person,
        contact_info: data.contact_info,
        address: data.address,
        category: data.category,
        performance_rating: data.performance_rating,
      },
      include: {
        contracts: true,
      },
    });

    return NextResponse.json(updatedVendor);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/vendors/{vendor_id}:
 *   delete:
 *     summary: Delete a vendor
 *     description: Deletes a vendor by ID
 *     tags:
 *       - Vendors
 *     parameters:
 *       - in: path
 *         name: vendor_id
 *         required: true
 *         description: ID of the vendor to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vendor deleted successfully
 *                 deletedVendor:
 *                   type: object
 *       400:
 *         description: Failed to delete vendor
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ vendor_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { vendor_id } = resolvedParams;
    const deletedVendor = await prisma.vendor.delete({
      where: { vendor_id: Number(vendor_id) },
    });

    return NextResponse.json({ message: "Vendor deleted successfully", deletedVendor });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 400 });
  }
}