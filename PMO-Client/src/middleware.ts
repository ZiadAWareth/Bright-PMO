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

/**
 * Role requirements for API groups, mirroring the page permissions in
 * `lib/route-access.ts`.
 *
 * The page guard is a client-side component: it stops the wrong role *seeing* a
 * screen, but anyone can still call the API directly. This is where the rule is
 * actually enforced, because the JWT has already been verified here and the
 * role claim is trustworthy.
 *
 * Longest prefix wins, so a specific entry can override a broader one.
 */
const API_ROLES: Record<string, string[]> = {
  '/api/procurements': ['PROC', 'PJM', 'PMO', 'ADMIN', 'DIR'],
  '/api/vendors': ['PROC', 'PJM', 'PMO', 'ADMIN', 'DIR'],
  '/api/rfq-responses': ['PROC', 'PJM', 'PMO', 'ADMIN', 'DIR'],
  '/api/schedules': ['PMO', 'PJM', 'ADMIN', 'DIR'],
  // Administrative surfaces. These are not feature endpoints scoped to the
  // caller — they read and write arbitrary tables, so ADMIN only.
  '/api/admin': ['ADMIN'],
  '/api/entities': ['ADMIN'],
  // Read to populate the role dropdown on the user edit form, so this
  // matches who may open /users rather than being ADMIN-only.
  '/api/roles': ['PMO', 'ADMIN', 'HR', 'DIR'],
  // Publishes every route, parameter and schema in the API. Useful to an
  // integrator, and a map of the attack surface to anyone else.
  '/api/swagger': ['ADMIN'],
};

/** The role list governing a path, matching the longest registered prefix. */
function rolesForApiPath(pathname: string): string[] | undefined {
  let best: string | undefined;
  for (const prefix of Object.keys(API_ROLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? API_ROLES[best] : undefined;
}

/**
 * Role requirements for *page* routes outside the `(app)` route group.
 *
 * Screens inside `(app)` are gated by `RouteGuard` in its layout, which reads
 * `lib/route-access.ts`. These three cannot rely on that:
 *
 *  - `/admin/[entity]` is a *server* component. It calls the entity API during
 *    render, so by the time any client guard could run the data has already
 *    been read. It has to be stopped before the request reaches the page.
 *  - `/api-docs` and `/report-generator` render outside the shell entirely.
 *
 * Gating them here also means a signed-out visitor is bounced by the same code
 * path as everything else, rather than rendering a shell-less error.
 */
const PAGE_ROLES: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/api-docs': ['ADMIN'],
  '/report-generator': ['ADMIN'],
};

/** The role list governing a page path, matching the longest registered prefix. */
function rolesForPagePath(pathname: string): string[] | undefined {
  let best: string | undefined;
  for (const prefix of Object.keys(PAGE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? PAGE_ROLES[best] : undefined;
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
    const candidate = authHeader.slice('Bearer '.length).trim();
    // Only accept something shaped like a JWT (three dot-separated segments).
    //
    // Many call sites build this header as `Bearer ${localStorage.getItem('token')}`,
    // which yields the literal "Bearer null" when nothing is stored, and the IdP
    // flow deliberately stores the placeholder "idp-authenticated" for backward
    // compatibility. Both start with "Bearer ", so without this check they were
    // taken as the token and shadowed the valid auth-token cookie below —
    // authenticating with a cookie then failing with 401 on every page.
    if (candidate.split('.').length === 3) {
      token = candidate;
    }
  }

  // Fallback to cookie when there is no usable Authorization header
  if (!token) {
    token = request.cookies.get('auth-token')?.value;
  }

  // Page routes render HTML, so an auth failure has to be a redirect to the
  // sign-in screen — returning a JSON body would paint raw text in the
  // browser. API routes keep the JSON 401 their callers expect.
  const isGatedPage = rolesForPagePath(pathname) !== undefined;
  const signInRedirect = () => {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  };

  if (!token) {
    // logDebug('No authentication token found');
    if (isGatedPage) return signInRedirect();
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
      if (isGatedPage) return signInRedirect();
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // Role gate. The token is verified at this point, so this claim is the one
    // trustworthy source of the caller's role — checking it here covers every
    // handler under the matched prefix, including routes that do no auth work
    // of their own.
    const normalisedRole = (role as string).toUpperCase();
    const allows = (roles: string[]) =>
      roles.some((r) => r.toUpperCase() === normalisedRole);

    const requiredApiRoles = rolesForApiPath(pathname);
    if (requiredApiRoles && !allows(requiredApiRoles)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Page routes get an HTML answer, not JSON: someone typing /admin in the
    // address bar should land on a readable screen. The 401 status is still
    // set so the response is honest to anything reading it programmatically.
    const requiredPageRoles = rolesForPagePath(pathname);
    if (requiredPageRoles && !allows(requiredPageRoles)) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.search = `?from=${encodeURIComponent(pathname)}`;
      return NextResponse.rewrite(url, { status: 401 });
    }

    // Create new headers with user information
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId.toString());
    requestHeaders.set('x-user-role', normalisedRole);
    
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
    if (isGatedPage) return signInRedirect();
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
    '/api/admin/:path*',              // Admin-only maintenance endpoints
    '/api/entities/:path*',           // Generic table reader — unauthenticated before this
    '/api/roles/:path*',              // Role definitions
    '/api/swagger',                   // The OpenAPI spec for the whole API
    '/admin/:path*',                  // Generic entity browser (server component)
    '/api-docs/:path*',               // Swagger UI
    '/report-generator/:path*',       // Cross-module report builder
  ]
}; 