/**
 * Axios Instance with Cookie Authentication
 * 
 * This pre-configured axios instance automatically sends cookies with requests.
 * On 401, tries IdP cookie-based refresh once, then retries the request.
 */

import axios from 'axios';
import { refreshIdpToken, storeRefreshedToken } from '@/lib/idp-refresh';

export const axiosWithAuth = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosWithAuth.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const h = config.headers;
  const auth =
    (typeof h?.get === "function" ? h.get("Authorization") : undefined) ??
    (h as Record<string, unknown>)?.Authorization;
  if (auth) return config;
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

axiosWithAuth.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status !== 401 || typeof window === 'undefined') {
      return Promise.reject(error);
    }
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/auth/')) return Promise.reject(error);

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
    return axiosWithAuth.request(config);
  }
);

export default axiosWithAuth;
