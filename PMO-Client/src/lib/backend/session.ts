/**
 * The signed-in session on the new backend (`PMO-Soul-Backend`).
 *
 * Soul issues its own JWT and reads it only from `Authorization: Bearer`, so
 * the client keeps it in localStorage next to the legacy `token`. The claims
 * (user, role, per-entity permissions, organisation) are read from the token
 * itself; they are for showing and hiding UI only, the backend checks them
 * again on every request.
 */

const TOKEN_KEY = "backendToken";

/** What Soul puts in its token, under `payload`. */
export interface BackendClaims {
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: number | null;
  roleName: string | null;
  /** Lowercase entity name -> action -> allowed, e.g. `portfolio.update`. */
  permissions: Record<string, Record<string, boolean>>;
  organizationId: number | null;
  isPlatformAdmin: boolean;
}

export interface BackendSession {
  token: string;
  claims: BackendClaims;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

/** True when `BACKEND_URL` is set, i.e. `/backend/...` is forwarded (next.config.ts). */
export const backendEnabled = process.env.NEXT_PUBLIC_BACKEND_ENABLED === "1";

function decodeSegment(segment: string): unknown {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Reads a Soul token without verifying it (only the backend can verify it). */
export function parseBackendToken(token: string): BackendSession | null {
  try {
    const body = decodeSegment(token.split(".")[1] ?? "") as {
      payload?: BackendClaims;
      exp?: number;
    };
    if (!body.payload || typeof body.exp !== "number") return null;
    return { token, claims: body.payload, expiresAt: body.exp * 1000 };
  } catch {
    return null;
  }
}

export function getBackendToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** The current session, or null when signed out or the token has expired. */
export function getBackendSession(): BackendSession | null {
  const token = getBackendToken();
  if (!token) return null;
  const session = parseBackendToken(token);
  if (!session || session.expiresAt <= Date.now()) return null;
  return session;
}

export function setBackendToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: calls to the new backend will be signed out.
  }
}

export function clearBackendSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}
