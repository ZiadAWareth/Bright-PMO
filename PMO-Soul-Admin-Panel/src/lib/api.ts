import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Empty base in dev → relative /api proxied by Vite to the backend (:3001).
// Set VITE_API_URL in production.
const API_URL = import.meta.env.VITE_API_URL ?? '';

export const TOKEN_KEY = 'auth_token';

/** Renew this many seconds before the token actually expires. */
const RENEW_BEFORE_SECONDS = 120;

export const api = axios.create({ baseURL: API_URL });

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; _skipAuth?: boolean };

// ── Session state ───────────────────────────────────────────
let refreshing: Promise<string> | null = null;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Seconds until the token expires; null when absent or unparseable. */
export function secondsUntilExpiry(token = getToken()): number | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!claims?.exp) return null;
    return claims.exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

function redirectToLogin() {
  clearToken();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Renew the token. Concurrent callers share ONE in-flight request — without this
 * a burst of parallel requests would each fire their own refresh.
 */
function refreshToken(): Promise<string> {
  if (refreshing) return refreshing;

  refreshing = api
    .post('/api/auth/refresh', null, { _skipAuth: false } as RetriableConfig)
    .then((res) => {
      const token = res.data?.accessToken ?? res.data?.token;
      if (!token) throw new Error('Refresh response contained no token');
      setToken(token);
      return token as string;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

// ── Request: attach the token, renewing first if it is about to lapse ──
api.interceptors.request.use(async (config) => {
  const cfg = config as RetriableConfig;
  let token = getToken();

  // Proactive renewal. This is the branch that prevents data loss: waiting for a
  // 401 means the token is already dead and refresh can no longer succeed.
  if (token && !cfg._skipAuth && !cfg.url?.includes('/auth/refresh')) {
    const remaining = secondsUntilExpiry(token);
    if (remaining !== null && remaining < RENEW_BEFORE_SECONDS && remaining > 0) {
      try {
        token = await refreshToken();
      } catch {
        // Fall through with the existing token; the response interceptor decides.
      }
    }
  }

  if (token) {
    cfg.headers = cfg.headers ?? ({} as any);
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// ── Response: one refresh + replay on 401, then give up ──
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const canRetry =
      status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh');

    if (canRetry) {
      original._retried = true;
      try {
        const token = await refreshToken();
        original.headers = original.headers ?? ({} as any);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        redirectToLogin();
      }
    } else if (status === 401) {
      redirectToLogin();
    }

    const raw = (error.response?.data as any)?.message || error.message || 'Request failed';
    const message = Array.isArray(raw) ? raw.join(', ') : raw;
    return Promise.reject(new Error(message));
  }
);
