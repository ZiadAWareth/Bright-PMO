import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/jwt';
import {
  IDP_COOKIE,
  SESSION_HANDOFF_MAX_AGE,
  cookieBaseOptions,
  resolveIdpConfig,
  sanitizeReturnTo,
} from '@/lib/idp-config';

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL('/auth/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

type JwtClaimsPayload = {
  sub?: string;
  id?: string;
  email?: string;
};

type UserinfoJson = {
  sub?: string;
  id?: string;
  email?: string;
};

type TokenExchangeJson = {
  success?: boolean;
  accessToken?: string;
  /** OAuth2 standard field name (some IdPs use this instead of accessToken). */
  access_token?: string;
  id_token?: string;
  expiresIn?: number;
  /** Some IdPs return identity on the token response body alongside accessToken. */
  sub?: string;
  email?: string;
  user?: { sub?: string; id?: string; email?: string };
};

/** Normalize IdP token JSON (camelCase vs snake_case). */
function normalizeTokenExchangeJson(raw: TokenExchangeJson): TokenExchangeJson {
  const accessToken = raw.accessToken ?? raw.access_token;
  const hasToken = Boolean(accessToken);
  return {
    ...raw,
    accessToken,
    success: hasToken && raw.success !== false,
  };
}

/** Decode IdP JWT (id_token or JWT access_token) for sub + email. */
function extractIdentityFromJwtClaims(jwt: string): {
  sub: string;
  email: string | null;
} | null {
  try {
    const payload = decodeJwt(jwt) as JwtClaimsPayload;
    const sub = payload.sub ?? payload.id;
    if (!sub || typeof sub !== 'string') return null;
    const email =
      typeof payload.email === 'string'
        ? payload.email.toLowerCase().trim()
        : null;
    return { sub, email };
  } catch {
    return null;
  }
}

function extractIdentityFromTokenResponseBody(
  json: TokenExchangeJson
): { sub: string; email: string | null } | null {
  if (typeof json.sub === 'string') {
    const email =
      typeof json.email === 'string'
        ? json.email.toLowerCase().trim()
        : null;
    return { sub: json.sub, email };
  }
  const u = json.user;
  if (u) {
    const sub = u.sub ?? u.id;
    if (typeof sub === 'string') {
      const email =
        typeof u.email === 'string'
          ? u.email.toLowerCase().trim()
          : null;
      return { sub, email };
    }
  }
  return null;
}

async function fetchUserIdentityFromUserinfo(
  idpAccessToken: string,
  userinfoUrl: string
): Promise<{ sub: string; email: string | null } | null> {
  const res = await fetch(userinfoUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idpAccessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    console.error('[IdP callback] userinfo failed', res.status);
    return null;
  }

  let data: UserinfoJson;
  try {
    data = (await res.json()) as UserinfoJson;
  } catch {
    return null;
  }

  const sub = data.sub ?? data.id;
  if (!sub || typeof sub !== 'string') return null;
  const email =
    typeof data.email === 'string' ? data.email.toLowerCase().trim() : null;
  return { sub, email };
}

/**
 * OAuth callback: exchange code, map user in DB, issue app JWT handoff cookie.
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

  const errParam = request.nextUrl.searchParams.get('error');
  if (errParam) {
    console.error('[IdP callback] authorize error', errParam);
    return loginRedirect(request, 'idp_authorize_denied');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(IDP_COOKIE.oauthState)?.value;
  const codeVerifier = cookieStore.get(IDP_COOKIE.pkceVerifier)?.value;
  const returnToCookie = cookieStore.get(IDP_COOKIE.returnTo)?.value;

  if (!code) {
    return loginRedirect(request, 'missing_code');
  }
  if (!codeVerifier) {
    return loginRedirect(request, 'missing_pkce');
  }

  // If IdP echoes `state`, it must match our cookie (CSRF). Some IdPs omit `state` on redirect;
  // PKCE still binds the authorization code to this browser session.
  if (state) {
    if (!expectedState || state !== expectedState) {
      return loginRedirect(request, 'invalid_state');
    }
  } else if (!expectedState) {
    return loginRedirect(request, 'missing_state');
  }

  let returnTo = '/dashboard';
  if (returnToCookie) {
    try {
      const decoded = decodeURIComponent(returnToCookie);
      const safe = sanitizeReturnTo(decoded);
      if (safe !== null) returnTo = safe;
    } catch {
      /* use default */
    }
  }

  const tokenBody: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  };
  if (config.clientId) {
    tokenBody.client_id = config.clientId;
  }
  if (config.clientSecret) {
    tokenBody.client_secret = config.clientSecret;
  }

  let tokenJson: TokenExchangeJson;
  try {
    const useForm = config.tokenRequestFormat === 'form';
    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: useForm
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : { 'Content-Type': 'application/json' },
      body: useForm
        ? new URLSearchParams(tokenBody).toString()
        : JSON.stringify(tokenBody),
    });

    const text = await tokenRes.text();

    if (!tokenRes.ok) {
      const snippet = text.slice(0, 280).replace(/\s+/g, ' ');
      console.error(
        '[IdP callback] token exchange HTTP',
        tokenRes.status,
        snippet || '(empty body)'
      );
      return loginRedirect(request, 'token_exchange_failed');
    }

    let parsed: TokenExchangeJson;
    try {
      parsed = JSON.parse(text) as TokenExchangeJson;
    } catch {
      console.error(
        '[IdP callback] token response is not JSON',
        text.slice(0, 200).replace(/\s+/g, ' ') || '(empty)'
      );
      return loginRedirect(request, 'token_exchange_failed');
    }

    tokenJson = normalizeTokenExchangeJson(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[IdP callback] token exchange error', msg);
    return loginRedirect(request, 'token_exchange_failed');
  }

  if (!tokenJson.success || !tokenJson.accessToken) {
    return loginRedirect(request, 'invalid_token_response');
  }

  let identity: { sub: string; email: string | null } | null = null;

  if (tokenJson.id_token) {
    identity = extractIdentityFromJwtClaims(tokenJson.id_token);
  }
  if (!identity) {
    identity = extractIdentityFromJwtClaims(tokenJson.accessToken);
  }
  if (!identity) {
    identity = extractIdentityFromTokenResponseBody(tokenJson);
  }
  if (!identity && config.userinfoUrl) {
    identity = await fetchUserIdentityFromUserinfo(
      tokenJson.accessToken,
      config.userinfoUrl
    );
  }

  if (!identity) {
    return loginRedirect(request, 'identity_failed');
  }

  const { sub, email } = identity;

  let user =
    (await prisma.user.findUnique({
      where: { idp_user_id: sub },
      include: { role: true },
    })) ?? null;

  if (!user && email) {
    user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  if (!user || user.status !== 'active') {
    return loginRedirect(request, 'user_not_found');
  }

  if (user.idp_user_id == null && sub) {
    try {
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { idp_user_id: sub },
      });
    } catch {
      console.error('[IdP callback] idp_user_id link failed');
      return loginRedirect(request, 'user_mapping_failed');
    }
  }

  let appJwt: string;
  try {
    appJwt = await createToken({
      userId: user.user_id,
      email: user.email,
      role: user.role.name,
    });
  } catch {
    return loginRedirect(request, 'session_failed');
  }

  const base = cookieBaseOptions();
  const completeUrl = new URL('/auth/idp-complete', request.url);
  completeUrl.searchParams.set('returnTo', returnTo);

  const res = NextResponse.redirect(completeUrl);

  res.cookies.set(IDP_COOKIE.sessionHandoff, appJwt, {
    ...base,
    maxAge: SESSION_HANDOFF_MAX_AGE,
  });

  res.cookies.delete(IDP_COOKIE.oauthState);
  res.cookies.delete(IDP_COOKIE.pkceVerifier);
  res.cookies.delete(IDP_COOKIE.returnTo);

  return res;
}
