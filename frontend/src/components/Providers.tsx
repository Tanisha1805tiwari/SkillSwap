'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const { accessToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }, [accessToken]);

  return <>{children}</>;
}
