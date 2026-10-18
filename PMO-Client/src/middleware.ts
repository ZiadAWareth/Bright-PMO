import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Page gating for routes outside the `(app)` route group.
 *
 * Screens inside `(app)` are gated by `RouteGuard` in its layout, which reads
 * `lib/route-access.ts`. `/api-docs` cannot rely on that: it renders outside
 * the shell entirely. Gating it here also means a signed-out visitor is bounced
 * to sign-in rather than seeing a shell-less error.
 *
 * API requests never reach this file: `next.config.ts` forwards `/api/...` to
 * the legacy API app, whose own middleware authenticates them.
 */
const PAGE_ROLES: Record<string, string[]> = {
  '/api-docs': ['ADMIN'],
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiredRoles = rolesForPagePath(pathname);
  if (!requiredRoles) return NextResponse.next();

  const signInRedirect = () => {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  };

  // A page load carries no Authorization header, so the cookie is the token.
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return signInRedirect();

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return signInRedirect();
  }

  let role: string | undefined;
  try {
    const verifyOpts: { issuer?: string; audience?: string } = {};
    if (process.env.JWT_ISSUER?.trim()) verifyOpts.issuer = process.env.JWT_ISSUER.trim();
    if (process.env.JWT_AUDIENCE?.trim()) verifyOpts.audience = process.env.JWT_AUDIENCE.trim();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), verifyOpts);
    role = typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return signInRedirect();
  }

  if (!role) return signInRedirect();

  // Someone typing a gated URL should land on a readable screen. The 401 status
  // is still set so the response is honest to anything reading it.
  if (!requiredRoles.some((r) => r.toUpperCase() === role.toUpperCase())) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    url.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.rewrite(url, { status: 401 });
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api-docs/:path*',               // Swagger UI
  ],
};
