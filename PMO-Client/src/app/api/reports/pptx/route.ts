import { NextRequest, NextResponse } from 'next/server';
import { generatePptx } from '@/lib/reporting/pptxGenerator';

export async function POST(req: NextRequest) {
  const { template, data } = await req.json();
  const pptx = generatePptx(template, data);
  // Use the correct API: pptx.write({ outputType: 'nodebuffer' })
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${template.name}.pptx"`
    }
  });
} 