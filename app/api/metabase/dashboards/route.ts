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

    // Try to fetch dashboards from Metabase
    const response = await fetch(`${metabaseUrl}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const dashboards = await response.json();
      return NextResponse.json({ 
        dashboards: Array.isArray(dashboards) ? dashboards : dashboards.data || []
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to fetch dashboards from Metabase', 
          status: response.status
        }, 
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Metabase dashboards fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to Metabase for dashboards',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}