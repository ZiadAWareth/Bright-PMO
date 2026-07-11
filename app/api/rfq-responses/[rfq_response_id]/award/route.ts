import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/rfq-responses/{rfq_response_id}/award:
 *   post:
 *     summary: Award a contract to an RFQ response
 *     description: Awards a contract by updating the RFQ response status and related procurement
 *     tags:
 *       - RFQ Responses
 *     parameters:
 *       - in: path
 *         name: rfq_response_id
 *         required: true
 *         description: ID of the RFQ response to award
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract awarded successfully
 *       404:
 *         description: RFQ response not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ rfq_response_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { rfq_response_id } = resolvedParams;

    // Get the RFQ response with procurement details
    const rfqResponse = await prisma.rFQResponse.findUnique({
      where: { rfq_response_id: Number(rfq_response_id) },
      include: { procurement: true },
    });

    if (!rfqResponse) {
      return NextResponse.json(
        { error: "RFQ response not found" },
        { status: 404 }
      );
    }

    // Update the RFQ response status to "Awarded"
    await prisma.rFQResponse.update({
      where: { rfq_response_id: Number(rfq_response_id) },
      data: { status: "Awarded" },
    });

    // Update the procurement status to "Awarded" and set actual cost
    await prisma.procurement.update({
      where: { procurement_id: rfqResponse.procurement_id },
      data: {
        status: "Awarded",
        actual_cost: rfqResponse.quote_amount,
      },
    });

    return NextResponse.json(
      { message: "Contract awarded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error awarding contract:", error);
    return NextResponse.json(
      { error: "Failed to award contract" },
      { status: 500 }
    );
  }
} 