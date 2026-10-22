import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '@/api/auth';
import { setSessionExpiredHandler } from '@/api/client';
import type { User } from '@/api/types';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
type Auth = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/**
 * 로그인 상태. 페이지를 열면 HttpOnly 쿠키(리프레시 토큰)로 세션을 되살린다 — 토큰은 브라우저 저장소에 두지 않는다(§3-2).
 * 로그아웃·세션 만료 때 메모리 토큰과 Query 캐시를 지운다(§3-18).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const reset = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(reset);
    let cancelled = false;
    authApi.restoreSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? 'signedIn' : 'signedOut');
    });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const value = useMemo<Auth>(
    () => ({
      status,
      user,
      signIn: async (email, password, rememberMe) => {
        setUser(await authApi.login(email, password, rememberMe));
        setStatus('signedIn');
      },
      signOut: async () => {
        await authApi.logout();
        reset();
      },
    }),
    [status, user, reset],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있다');
  return value;
}
