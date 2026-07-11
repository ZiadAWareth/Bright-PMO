import axios from 'axios';

const instance = axios.create({
  // Empty = same origin as the page (any dev port e.g. 3002). Do not default to :3000.
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Dashboard and other features use this instance (not default axios from axios-config).
// Attach PMO JWT from localStorage so middleware accepts Authorization: Bearer.
instance.interceptors.request.use(
  (config) => {
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
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error:', {
        message: 'No response received from server',
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance; 
