import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload as JoseJWTPayload } from 'jose';

interface JWTPayload extends JoseJWTPayload {
  sub?: string; // User ID from IdP
  userId?: number; // PMO app JWT from createToken (IdP callback)
  user_id?: string;
  role?: string;
  email?: string;
  name?: string;
}

// Debug logging function
function logDebug(message: string, data?: any) {
  console.log('🔒 Middleware Debug:', message, data ? JSON.stringify(data, null, 2) : '');
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/auth/signin',
  '/auth/login',
  '/auth/callback',
  '/auth/callback/complete',
  '/auth/logout',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/set-token',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // logDebug('Middleware executing for path:', pathname);

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // logDebug('Public path accessed:', pathname);
    return NextResponse.next();
  }
  
  // Check if this is a finance API route (handles both /api/projects/finance and /api/projects/finance/[projectCode])
  const isFinanceRoute = pathname.startsWith('/api/projects/finance');
  
  if (isFinanceRoute) {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
    const expectedApiKey = process.env.FINANCE_API_ACCESS_KEY;
    
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      // logDebug('Valid API key provided for finance route');
      return NextResponse.next();
    } else {
      // logDebug('Invalid or missing API key for finance route');
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }
  }

  // Try to get token from Authorization header first (localStorage flow), then fall back to cookie
  let token: string | undefined;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // Fallback to cookie if no Authorization header
  if (!token) {
    token = request.cookies.get('auth-token')?.value;
  }

  if (!token) {
    // logDebug('No authentication token found');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify JWT token from IdP
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_ISSUER = process.env.JWT_ISSUER;
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const verifyOpts: { issuer?: string; audience?: string } = {};
    if (JWT_ISSUER?.trim()) verifyOpts.issuer = JWT_ISSUER.trim();
    if (JWT_AUDIENCE?.trim()) verifyOpts.audience = JWT_AUDIENCE.trim();
    const { payload } = await jwtVerify(token, secret, verifyOpts);

    // logDebug('Token verified successfully:', payload);

    // Extract user information from payload
    // Get PMO user_id from cookie (set during callback) or use IdP user ID from payload
    const pmoUserIdCookie = request.cookies.get('pmo-user-id')?.value;
    const p = payload as JWTPayload;
    const userId =
      pmoUserIdCookie ??
      (p.userId != null ? String(p.userId) : undefined) ??
      p.sub;
    
    const role = payload.role;
    const email = payload.email;
    const name = payload.name;

    if (!userId || !role) {
      console.error('Missing required fields in token payload:', { userId, role });
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // Create new headers with user information
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId.toString());
    requestHeaders.set('x-user-role', (role as string).toUpperCase());
    
    if (email) {
      requestHeaders.set('x-user-email', email as string);
    }
    
    if (name) {
      requestHeaders.set('x-user-name', name as string);
    }
    
    // logDebug('Headers set:', {
    //   'x-user-id': userId.toString(),
    //   'x-user-role': role,
    // });

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error: any) {
    // logDebug('Token verification failed:', error.message);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api/analytics/:path*',          // Protect all analytics/dashboard routes
    '/api/reporting/:path*',          // Protect the reporting-engine proxy (exposes schema)
    '/api/tasks/:path*',              // Protect all task routes
    '/api/auth/me',                   // Protect user info endpoint
    '/api/auth/refresh',              // Protect token refresh endpoint
    '/api/notifications/:path*',      // Protect all notification routes
    '/api/users/:path*',               // Protect all user routes
    '/api/fieldData/:path*',
    '/api/documents/:path*',
    '/api/users/:path*',              // Protect all user routes
    '/api/projects/:path*' ,        // Protect all project routes
    '/api/eps/:path*',       // Protect all eps routes
    '/api/portfolios/:path*',         // Protect all porfolio routes
    '/api/time-entries/:path*',
    '/api/timesheets/:path*',
    '/api/risks/:path*',
    '/api/riskMitigations/:path*',
    '/api/rfq-responses/:path*',      // Protect all RFQ response routes
    '/api/procurements/:path*',       // Protect all procurement routes
    '/api/vendors/:path*',            // Protect all vendor routes
    '/api/contracts/:path*',         // Protect all contract routes
    '/api/schedules/:path*',
    '/api/resources/:path*', // Protect all resource routes
    '/api/resourceAssignments/:path*', // Protect all resource assignment routes
    '/api/recent-activities/:path*', // Protect all recent activity routes
    '/api/wbs/:path*',                // Protect all WBS routes
  ]
}; 