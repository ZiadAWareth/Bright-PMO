/**
 * IdP OAuth/OIDC configuration (server-side).
 *
 * Feature flags:
 * - USE_IDP_AUTH — server: "true" enables /api/auth/idp/start, callback, bootstrap
 * - NEXT_PUBLIC_USE_IDP_AUTH — client: "true" shows SSO login + IdP logout redirect when set
 *
 * When USE_IDP_AUTH=true, set at minimum:
 * - NEXT_PUBLIC_IDP_URL — IdP base URL
 * - NEXT_PUBLIC_APP_URL — consumer app origin (redirect_uri = {APP}/api/auth/callback)
 * - IDP_CLIENT_ID — optional; omit if your IdP has no OAuth client id
 * - IDP_CLIENT_SECRET — optional; if confidential client
 *
 * Identity (sub + email) is taken from the token response in this order: id_token, JWT accessToken
 * payload, or flat fields on the JSON body. Optional IDP_USERINFO_URL — GET with Bearer access token
 * if identity is not present in the token response.
 *
 * Optional: IDP_TOKEN_URL (default {IDP_URL}/auth/api/auth/token), IDP_AUTHORIZE_URL (default: {IDP_URL} root),
 * IDP_TOKEN_REQUEST_FORMAT=json|form — many OAuth servers expect application/x-www-form-urlencoded (form),
 * IDP_SCOPE, IDP_LOGOUT_URL (server-side URL for docs), NEXT_PUBLIC_IDP_LOGOUT_URL (browser redirect after logout)
 */

export const IDP_COOKIE = {
  oauthState: 'idp_oauth_state',
  pkceVerifier: 'idp_pkce_verifier',
  returnTo: 'idp_return_to',
  sessionHandoff: 'app_session_handoff',
} as const;

/** OAuth cookies lifetime during authorize → callback (seconds). */
export const IDP_OAUTH_COOKIE_MAX_AGE = 600;

/** Handoff cookie max-age (seconds); align with app JWT lifetime (~24h). */
export const SESSION_HANDOFF_MAX_AGE = 60 * 60 * 24;

export function isUseIdpAuth(): boolean {
  return process.env.USE_IDP_AUTH === 'true';
}

export type IdpConfigErrorCode =
  | 'idp_disabled'
  | 'missing_public_idp_url'
  | 'missing_app_url';

export type IdpConfig =
  | { ok: true; config: ResolvedIdpConfig }
  | { ok: false; code: IdpConfigErrorCode };

export type ResolvedIdpConfig = {
  idpBaseUrl: string;
  appOrigin: string;
  redirectUri: string;
  tokenUrl: string;
  authorizeUrl: string;
  /** Empty = skip userinfo; use id_token / JWT access token / JSON body only. */
  userinfoUrl: string;
  /** Empty if IdP does not use OAuth client_id. */
  clientId: string;
  /** Empty if no client secret. */
  clientSecret: string;
  logoutUrl: string | null;
  /** Space-separated OAuth scopes for authorize URL */
  scope: string;
  /** POST body for token endpoint: json (default) or form (application/x-www-form-urlencoded). */
  tokenRequestFormat: 'json' | 'form';
};

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Resolve IdP URLs and secrets when USE_IDP_AUTH is true.
 * Call from route handlers; redirect to login with error if not ok.
 */
export function resolveIdpConfig(): IdpConfig {
  if (!isUseIdpAuth()) {
    return { ok: false, code: 'idp_disabled' };
  }

  const idpBase = process.env.NEXT_PUBLIC_IDP_URL?.trim();
  if (!idpBase) {
    return { ok: false, code: 'missing_public_idp_url' };
  }

  const appOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ''
  ).trim();
  if (!appOrigin) {
    return { ok: false, code: 'missing_app_url' };
  }

  const userinfoUrl = process.env.IDP_USERINFO_URL?.trim() ?? '';

  const clientId = process.env.IDP_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.IDP_CLIENT_SECRET?.trim() ?? '';

  const base = trimTrailingSlash(idpBase);
  const origin = trimTrailingSlash(appOrigin);

  const tokenUrl =
    process.env.IDP_TOKEN_URL?.trim() || `${base}/auth/api/auth/token`;
  /** Default: IdP base URL only; OAuth query params are appended by /api/auth/idp/start. */
  const authorizeUrl =
    process.env.IDP_AUTHORIZE_URL?.trim() || base;

  const logoutUrl = process.env.IDP_LOGOUT_URL?.trim() || null;

  const scope =
    process.env.IDP_SCOPE?.trim() || 'openid profile email';

  const tokenRequestFormat: 'json' | 'form' =
    process.env.IDP_TOKEN_REQUEST_FORMAT?.trim().toLowerCase() === 'form'
      ? 'form'
      : 'json';

  return {
    ok: true,
    config: {
      idpBaseUrl: base,
      appOrigin: origin,
      redirectUri: `${origin}/api/auth/callback`,
      tokenUrl,
      authorizeUrl,
      userinfoUrl,
      clientId,
      clientSecret,
      logoutUrl,
      scope,
      tokenRequestFormat,
    },
  };
}

/**
 * Safe internal redirect path only (open-redirect hardening).
 * Returns null if invalid.
 */
export function sanitizeReturnTo(raw: string | null): string | null {
  if (raw == null || raw === '') {
    return '/analytics/dashboard';
  }
  const decoded = decodeURIComponent(raw);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return null;
  }
  if (decoded.includes('\\') || decoded.includes('\0')) {
    return null;
  }
  return decoded;
}

export function cookieBaseOptions(): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
} {
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
}
