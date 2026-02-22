import axios from 'axios';
import { API_CONFIG } from './config';

export const api = axios.create({
  baseURL: API_CONFIG.baseUrl ? `${API_CONFIG.baseUrl}/api` : '/api',
  timeout: 120000, // AI 生成需要较长时间
});

// 请求拦截器 - 自动添加认证 token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        if (state?.accessToken) {
          config.headers['Authorization'] = `Bearer ${state.accessToken}`;
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token 刷新状态
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// 响应拦截器 - 处理 401 自动刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 且不是刷新请求本身
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 等待刷新完成
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 从 localStorage 获取 refreshToken
        const stored = localStorage.getItem('auth-storage');
        const { refreshToken } = stored ? JSON.parse(stored).state : {};

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshUrl = API_CONFIG.baseUrl ? `${API_CONFIG.baseUrl}/api/auth/refresh` : '/api/auth/refresh';
        const res = await axios.post(refreshUrl, { refreshToken });
        const { accessToken } = res.data;

        // 更新存储
        const newState = stored ? JSON.parse(stored) : { state: {} };
        newState.state.accessToken = accessToken;
        localStorage.setItem('auth-storage', JSON.stringify(newState));

        // 更新默认 header
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        onTokenRefreshed(accessToken);
        isRefreshing = false;

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        // 刷新失败，清除认证状态
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
