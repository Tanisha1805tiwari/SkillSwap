import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

// Request interceptor — attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('skillswap-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      }
    } catch { /* ignore */ }
  }
  return config;
});

// Response interceptor — handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        const { accessToken } = res.data.data;

        // Update stored token
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('skillswap-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.state.accessToken = accessToken;
            localStorage.setItem('skillswap-auth', JSON.stringify(parsed));
          }
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear auth state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('skillswap-auth');
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Typed API helpers
export const apiGet = <T>(url: string, params?: object) =>
  api.get<{ success: boolean; data: T }>(url, { params }).then((r) => r.data.data);

export const apiPost = <T>(url: string, body?: object) =>
  api.post<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiPut = <T>(url: string, body?: object) =>
  api.put<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiPatch = <T>(url: string, body?: object) =>
  api.patch<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiDelete = <T>(url: string) =>
  api.delete<{ success: boolean; data: T }>(url).then((r) => r.data.data);
