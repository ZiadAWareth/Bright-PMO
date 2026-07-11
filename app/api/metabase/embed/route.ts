import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { dashboardId } = await request.json();
    
    const metabaseUrl = process.env.NEXT_PUBLIC_METABASE_URL;
    const secretKey = process.env.METABASE_SECRET_KEY;
    
    if (!metabaseUrl) {
      return NextResponse.json(
        { error: 'Metabase URL not configured' }, 
        { status: 500 }
      );
    }

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Metabase secret key not configured' }, 
        { status: 500 }
      );
    }

    // Create JWT payload for embedding
    const payload = {
      resource: { dashboard: Number(dashboardId) },
      params: {},
      exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minutes
    };

    // Create JWT token
    const token = createJWT(payload, secretKey);
    
    const embedUrl = `${metabaseUrl}/embed/dashboard/${token}#bordered=true&titled=true`;
    
    return NextResponse.json({ embedUrl });
  } catch (error) {
    console.error('Metabase embed error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate embed URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

function createJWT(payload: any, secret: string): string {
  const header = {
    typ: 'JWT',
    alg: 'HS256'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}