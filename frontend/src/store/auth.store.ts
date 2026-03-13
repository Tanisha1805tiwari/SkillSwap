import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  credits: number;
  timezone: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleAuth: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      setAccessToken: (token: string) => {
        set({ accessToken: token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, accessToken } = res.data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', { name, email, password });
          const { user, accessToken } = res.data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      googleAuth: async (token: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/google', { token });
          const { user, accessToken } = res.data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch { /* ignore */ }
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.data.user });
        } catch { /* ignore */ }
      },

      updateUser: (updates: Partial<User>) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },
    }),
    {
      name: 'skillswap-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
