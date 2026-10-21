import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  clearBackendSession,
  getBackendSession,
  setBackendToken,
} from "@/lib/backend/session";

/**
 * HTTP client for the new backend. Feature `api.ts` files use this, never
 * axios directly: `backend.get("/portfolio")` calls `/backend/portfolio` on
 * this origin, which next.config.ts forwards to Soul's `/api/portfolio`.
 *
 * - Sends the Soul token as `Authorization: Bearer`.
 * - Renews it shortly before it expires (Soul's `/auth/refresh` only accepts a
 *   token that is still valid, so it must happen before, not after, expiry).
 * - On 401 the session is over: clears it and goes to sign-in.
 */
export const backend = axios.create({
  baseURL: "/backend",
  headers: { "Content-Type": "application/json" },
});

/** Renew when less than this is left on the token. */
const RENEW_BEFORE_MS = 10 * 60 * 1000;

let renewing: Promise<void> | null = null;

function renewToken(token: string): Promise<void> {
  renewing ??= axios
    .post<{ accessToken?: string }>("/backend/auth/refresh", null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => {
      if (response.data?.accessToken) setBackendToken(response.data.accessToken);
    })
    .catch(() => {
      // Keep the current token; the request below still works until it expires.
    })
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

backend.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;
  let session = getBackendSession();
  if (session && session.expiresAt - Date.now() < RENEW_BEFORE_MS) {
    await renewToken(session.token);
    session = getBackendSession();
  }
  if (session) config.headers.set("Authorization", `Bearer ${session.token}`);
  return config;
});

backend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith("/auth/")
    ) {
      clearBackendSession();
      const returnTo = window.location.pathname + window.location.search;
      window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    return Promise.reject(error);
  },
);
