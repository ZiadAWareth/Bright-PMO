import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/rfq-responses:
 *   get:
 *     summary: Get all RFQ responses
 *     description: Retrieves a list of all RFQ responses with related procurement and vendor information
 *     tags:
 *       - RFQ Responses
 *     responses:
 *       200:
 *         description: List of RFQ responses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   rfq_response_id:
 *                     type: integer
 *                   procurement_id:
 *                     type: integer
 *                   vendor_id:
 *                     type: integer
 *                   quote_amount:
 *                     type: number
 *                   delivery_time:
 *                     type: string
 *                   technical_score:
 *                     type: integer
 *                   commercial_score:
 *                     type: integer
 *                   total_score:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   submitted_date:
 *                     type: string
 *                     format: date-time
 *                   notes:
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
    console.log('Fetching RFQ responses...');
    
    const rfqResponses = await prisma.rFQResponse.findMany({
      include: {
        procurement: true,
        vendor: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    
    console.log('RFQ responses found:', rfqResponses.length);
    
    // Return empty array if no responses found (this is normal)
    return NextResponse.json(rfqResponses || []);
  } catch (error) {
    console.error('Error fetching RFQ responses:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch RFQ responses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/rfq-responses:
 *   post:
 *     summary: Create a new RFQ response
 *     description: Creates a new RFQ response for a procurement
 *     tags:
 *       - RFQ Responses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - procurement_id
 *               - vendor_id
 *               - quote_amount
 *               - delivery_time
 *               - technical_score
 *               - commercial_score
 *             properties:
 *               procurement_id:
 *                 type: integer
 *                 description: ID of the procurement this response is for
 *               vendor_id:
 *                 type: integer
 *                 description: ID of the vendor submitting the response
 *               quote_amount:
 *                 type: number
 *                 description: Quote amount in OMR
 *               delivery_time:
 *                 type: string
 *                 description: Delivery time (e.g., "30 days")
 *               technical_score:
 *                 type: integer
 *                 description: Technical evaluation score (0-100)
 *               commercial_score:
 *                 type: integer
 *                 description: Commercial evaluation score (0-100)
 *               notes:
 *                 type: string
 *                 description: Additional notes about the response
 *     responses:
 *       201:
 *         description: RFQ response created successfully
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('RFQ Response creation request body:', body);
    
    // Validate required fields - check for null/undefined, not falsy values like 0
    const requiredFields = ['procurement_id', 'vendor_id', 'quote_amount', 'delivery_time'];
    const missingFields = requiredFields.filter(field => body[field] === null || body[field] === undefined || body[field] === '');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Set default values for scores if not provided
    const technicalScore = body.technical_score || 0;
    const commercialScore = body.commercial_score || 0;
    
    // Calculate total score
    const totalScore = Math.round((technicalScore * 0.6) + (commercialScore * 0.4));

    console.log('Creating RFQ response with data:', {
      procurement_id: body.procurement_id,
      vendor_id: body.vendor_id,
      quote_amount: body.quote_amount,
      delivery_time: body.delivery_time,
      technical_score: technicalScore,
      commercial_score: commercialScore,
      total_score: totalScore,
      status: body.status || "Submitted",
      notes: body.notes || null,
    });

    // Create the RFQ response
    const rfqResponse = await prisma.rFQResponse.create({
      data: {
        procurement_id: body.procurement_id,
        vendor_id: body.vendor_id,
        quote_amount: body.quote_amount,
        delivery_time: body.delivery_time,
        technical_score: technicalScore,
        commercial_score: commercialScore,
        total_score: totalScore,
        status: body.status || "Submitted",
        notes: body.notes || null,
      },
      include: {
        procurement: true,
        vendor: true,
      },
    });

    console.log('RFQ response created successfully:', rfqResponse.rfq_response_id);
    return NextResponse.json(rfqResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating RFQ response:', error);
    return NextResponse.json(
      { error: 'Failed to create RFQ response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 