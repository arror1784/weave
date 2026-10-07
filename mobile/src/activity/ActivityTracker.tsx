import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { clearActivity, flushActivity, logActivity } from '@/api/activity';
import { useAuth } from '@/auth/AuthProvider';

/**
 * 화면 없는 컴포넌트 — 앱 사용 기록(사용자 결정 2026-10-07): 앱이 뜨거나 다시 앞으로 오면 "앱 열기", 화면이 바뀌면 "화면 보기"를 남겨 서버로 보낸다.
 * 로그인 전에는 남기지 않고, 로그아웃하면 기기에 쌓인 기록을 지운다.
 */
export function ActivityTracker() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      if (status === 'signedOut') clearActivity();
      lastPath.current = null;
      return;
    }
    logActivity('APP_OPENED');
    flushActivity();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      logActivity('APP_OPENED');
      flushActivity();
    });
    return () => sub.remove();
  }, [signedIn, status]);

  useEffect(() => {
    if (!signedIn || pathname === lastPath.current) return;
    lastPath.current = pathname;
    logActivity('SCREEN_VIEWED', { path: pathname });
    flushActivity();
  }, [signedIn, pathname]);

  return null;
}
