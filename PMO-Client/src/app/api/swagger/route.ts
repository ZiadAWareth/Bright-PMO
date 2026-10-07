import { NextResponse } from 'next/server';
import swaggerSpec from '@/legacy-server/swagger';

export async function GET() {
  return NextResponse.json(swaggerSpec);
} 