/**
 * IdP cookie-based token refresh (client-side only).
 * The IdP uses a session cookie; we call /auth/api/auth/refresh with credentials
 * to get a new access token.
 */

const IDP_URL = process.env.NEXT_PUBLIC_IDP_URL || '';

/** Decode JWT payload without verification (client-side; we only need exp). Returns exp in ms, or null. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const exp = payload.exp;
    if (typeof exp !== 'number') return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

/** Call IdP refresh endpoint with session cookie; returns new accessToken or null. */
export async function refreshIdpToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`${IDP_URL}/auth/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.accessToken) return data.accessToken;
    return null;
  } catch {
    return null;
  }
}

/** Store new token in localStorage and sync to app cookie via /api/auth/set-token. */
export async function storeRefreshedToken(token: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  try {
    await fetch('/api/auth/set-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Cookie sync is best-effort; localStorage is already updated
  }
}
