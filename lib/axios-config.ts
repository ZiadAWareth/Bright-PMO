/**
 * Global Axios Configuration
 * 
 * This file configures axios to work with HTTP-only cookie authentication.
 * On 401, tries IdP cookie-based refresh once, then retries the request.
 */

import axios from 'axios';
import { refreshIdpToken, storeRefreshedToken } from '@/lib/idp-refresh';
import { apiBaseUrl } from '@/lib/api-base-url';

// Configure axios to send cookies with all requests
axios.defaults.withCredentials = true;

// Configure axios to use the correct base URL (same origin in the browser)
axios.defaults.baseURL = apiBaseUrl;

// After IdP bootstrap, the app JWT may live only in localStorage until /api/auth/set-token runs.
// Attach it so middleware sees Authorization: Bearer (matches cookie-based auth).
axios.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const h = config.headers;
  const existing =
    (typeof h?.get === "function" ? h.get("Authorization") : undefined) ??
    (h as { Authorization?: string } | undefined)?.Authorization;
  if (existing) return config;
  const token = localStorage.getItem("token");
  if (!token) return config;
  if (h && typeof h.set === "function") {
    h.set("Authorization", `Bearer ${token}`);
  } else if (h && typeof h === "object") {
    (h as { Authorization?: string }).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor: on 401 try IdP refresh, retry once, then redirect to login
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status !== 401 || typeof window === 'undefined') {
      return Promise.reject(error);
    }
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/auth/')) {
      return Promise.reject(error);
    }

    const config = error.config;
    if (config?._idpRefreshRetried) {
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }

    const url = config?.url ?? '';
    if (url.includes('/auth/') || url.includes('/api/auth/set-token')) {
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }

    const newToken = await refreshIdpToken();
    if (!newToken) {
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }

    await storeRefreshedToken(newToken);
    config._idpRefreshRetried = true;
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${newToken}`;
    return axios.request(config);
  }
);

export default axios;
