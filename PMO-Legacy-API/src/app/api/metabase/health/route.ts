import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const metabaseUrl = process.env.NEXT_PUBLIC_METABASE_URL;
    
    if (!metabaseUrl) {
      return NextResponse.json(
        { error: 'Metabase URL not configured' }, 
        { status: 500 }
      );
    }

    // Check if Metabase is accessible
    const response = await fetch(`${metabaseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const healthData = await response.json();
      return NextResponse.json({ 
        status: 'healthy',
        metabaseUrl,
        data: healthData 
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Metabase health check failed', 
          status: response.status,
          metabaseUrl
        }, 
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Metabase health check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to Metabase',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}