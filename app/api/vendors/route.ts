import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieves a list of all vendors with their associated contracts
 *     tags:
 *       - Vendors
 *     responses:
 *       200:
 *         description: List of vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   vendor_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   contact_person:
 *                     type: string
 *                   contact_info:
 *                     type: string
 *                   address:
 *                     type: string
 *                   category:
 *                     type: string
 *                   performance_rating:
 *                     type: number
 *                     format: float
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   contracts:
 *                     type: array
 *                     items:
 *                       type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        contracts: true
      }
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create a new vendor
 *     description: Creates a new vendor with the provided details
 *     tags:
 *       - Vendors
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - contact_person
 *               - contact_info
 *               - address
 *               - category
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
 *                 description: Performance rating (defaults to 0)
 *     responses:
 *       201:
 *         description: Vendor created successfully
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
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'contact_person', 'contact_info', 'address', 'category'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        contact_person: body.contact_person,
        contact_info: body.contact_info,
        address: body.address,
        category: body.category,
        performance_rating: body.performance_rating || 0
      },
      include: {
        contracts: true
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
