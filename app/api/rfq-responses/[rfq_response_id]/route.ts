import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/rfq-responses/{rfq_response_id}:
 *   get:
 *     summary: Get an RFQ response by ID
 *     description: Retrieves a specific RFQ response by its ID with related data
 *     tags:
 *       - RFQ Responses
 *     parameters:
 *       - in: path
 *         name: rfq_response_id
 *         required: true
 *         description: ID of the RFQ response to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: RFQ response retrieved successfully
 *       404:
 *         description: RFQ response not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ rfq_response_id: string }> }) {
  const resolvedParams = await context.params;
  const { rfq_response_id } = resolvedParams;
  
  try {
    const rfqResponse = await prisma.rFQResponse.findUnique({
      where: { rfq_response_id: Number(rfq_response_id) },
      include: {
        procurement: true,
        vendor: true,
      },
    });

    if (!rfqResponse) {
      return NextResponse.json({ error: "RFQ response not found" }, { status: 404 });
    }

    return NextResponse.json(rfqResponse);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch RFQ response" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/rfq-responses/{rfq_response_id}:
 *   put:
 *     summary: Update an RFQ response
 *     description: Updates an existing RFQ response by ID
 *     tags:
 *       - RFQ Responses
 *     parameters:
 *       - in: path
 *         name: rfq_response_id
 *         required: true
 *         description: ID of the RFQ response to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quote_amount:
 *                 type: number
 *               delivery_time:
 *                 type: string
 *               technical_score:
 *                 type: integer
 *               commercial_score:
 *                 type: integer
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: RFQ response updated successfully
 *       404:
 *         description: RFQ response not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ rfq_response_id: string }> }) {
  const resolvedParams = await context.params;
  const { rfq_response_id } = resolvedParams;
  
  try {
    const data = await req.json();
    
    // Calculate total score if technical or commercial scores are updated
    let totalScore;
    if (data.technical_score !== undefined || data.commercial_score !== undefined) {
      const current = await prisma.rFQResponse.findUnique({
        where: { rfq_response_id: Number(rfq_response_id) },
      });
      
      const technicalScore = data.technical_score ?? current?.technical_score ?? 0;
      const commercialScore = data.commercial_score ?? current?.commercial_score ?? 0;
      totalScore = Math.round((technicalScore * 0.6) + (commercialScore * 0.4));
    }

    const updatedRFQResponse = await prisma.rFQResponse.update({
      where: { rfq_response_id: Number(rfq_response_id) },
      data: {
        ...data,
        ...(totalScore !== undefined && { total_score: totalScore }),
        updated_at: new Date(),
      },
      include: {
        procurement: true,
        vendor: true,
      },
    });

    return NextResponse.json(updatedRFQResponse);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update RFQ response" }, { status: 400 });
  }
}

/**
 * @swagger
 * /api/rfq-responses/{rfq_response_id}:
 *   delete:
 *     summary: Delete an RFQ response
 *     description: Deletes an RFQ response by ID
 *     tags:
 *       - RFQ Responses
 *     parameters:
 *       - in: path
 *         name: rfq_response_id
 *         required: true
 *         description: ID of the RFQ response to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: RFQ response deleted successfully
 *       404:
 *         description: RFQ response not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ rfq_response_id: string }> }) {
  const resolvedParams = await context.params;
  const { rfq_response_id } = resolvedParams;
  
  try {
    const deletedRFQResponse = await prisma.rFQResponse.delete({
      where: { rfq_response_id: Number(rfq_response_id) },
    });

    return NextResponse.json({ 
      message: "RFQ response deleted successfully", 
      deletedRFQResponse 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete RFQ response" }, { status: 400 });
  }
} 