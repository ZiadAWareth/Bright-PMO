import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import {
  IDP_COOKIE,
  IDP_OAUTH_COOKIE_MAX_AGE,
  cookieBaseOptions,
  resolveIdpConfig,
  sanitizeReturnTo,
} from '@/lib/idp-config';

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL('/auth/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

/**
 * Starts OAuth: sets state + PKCE cookies and redirects to IdP authorize URL.
 * GET /api/auth/idp/start?returnTo=/analytics/dashboard
 */
export async function GET(request: NextRequest) {
  const resolved = resolveIdpConfig();
  if (!resolved.ok) {
    if (resolved.code === 'idp_disabled') {
      return loginRedirect(request, 'idp_disabled');
    }
    return loginRedirect(request, 'idp_misconfigured');
  }

  const { config } = resolved;
  const returnParam = request.nextUrl.searchParams.get('returnTo');
  const returnTo = sanitizeReturnTo(returnParam);
  if (returnTo === null) {
    return loginRedirect(request, 'invalid_return_to');
  }

  const state = base64UrlEncode(randomBytes(24));
  const { verifier, challenge } = generatePkcePair();

  const authorize = new URL(config.authorizeUrl);
  authorize.searchParams.set('response_type', 'code');
  if (config.clientId) {
    authorize.searchParams.set('client_id', config.clientId);
  }
  authorize.searchParams.set('redirect_uri', config.redirectUri);
  authorize.searchParams.set('scope', config.scope);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  const base = cookieBaseOptions();
  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(IDP_COOKIE.oauthState, state, {
    ...base,
    maxAge: IDP_OAUTH_COOKIE_MAX_AGE,
  });
  res.cookies.set(IDP_COOKIE.pkceVerifier, verifier, {
    ...base,
    maxAge: IDP_OAUTH_COOKIE_MAX_AGE,
  });
  res.cookies.set(IDP_COOKIE.returnTo, encodeURIComponent(returnTo), {
    ...base,
    maxAge: IDP_OAUTH_COOKIE_MAX_AGE,
  });

  return res;
}
