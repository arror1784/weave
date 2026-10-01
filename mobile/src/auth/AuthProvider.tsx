import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '@/api/auth';
import { refreshSession, setSessionExpiredHandler } from '@/api/client';
import type { User } from '@/api/types';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
type Auth = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/**
 * 로그인 상태. 앱을 켜면 보안 저장소의 리프레시 토큰으로 세션을 되살린다.
 * 로그아웃·탈퇴·세션 만료 시 기기 데이터(토큰·Query 캐시)를 지운다(루트 CLAUDE.md §3-18).
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
    (async () => {
      const restored = await refreshSession();
      const me = restored ? await authApi.getMe().catch(() => null) : null;
      if (cancelled) return;
      setUser(me);
      setStatus(me ? 'signedIn' : 'signedOut');
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const value = useMemo<Auth>(
    () => ({
      status,
      user,
      signIn: async (email, password) => {
        setUser(await authApi.login(email, password));
        setStatus('signedIn');
      },
      signUp: async (email, password) => {
        setUser(await authApi.signup(email, password));
        setStatus('signedIn');
      },
      signOut: async () => {
        await authApi.logout().catch(() => {});
        reset();
      },
      deleteAccount: async () => {
        await authApi.deleteAccount();
        reset();
      },
    }),
    [status, user, reset],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있다');
  return auth;
}

/** 테스트용: 정해진 로그인 상태를 그대로 내려 준다 */
export const AuthContextForTest = AuthContext;
