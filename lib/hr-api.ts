/**
 * HR API client – calls the external HR service (organization/units, employees).
 * Uses NEXT_PUBLIC_HR_URL and the same Bearer token as the app.
 */

import axios from 'axios';

const baseURL = (process.env.NEXT_PUBLIC_HR_URL || '').trim() || '';

export const hrApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

hrApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default hrApi;
