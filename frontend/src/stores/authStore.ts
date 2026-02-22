/**
 * 认证状态管理 - JWT 版本
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await axios.post('/api/auth/login', { email, password });
          const { accessToken, refreshToken, user } = res.data;

          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, refreshToken, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || '登录失败');
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          await axios.post('/api/auth/register', data);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || '注册失败');
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await axios.post('/api/auth/logout');
          } catch {}
        }
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, refreshToken: null });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          const res = await axios.get('/api/auth/me');
          set({ user: res.data.user });
        } catch {
          // Token 过期，尝试刷新
          const refreshed = await get().refreshAccessToken();
          if (!refreshed) {
            set({ user: null, accessToken: null, refreshToken: null });
            delete axios.defaults.headers.common['Authorization'];
          }
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, user } = res.data;

          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ accessToken, user });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
