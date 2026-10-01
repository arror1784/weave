import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError } from '@/api/client';

// 서버 상태는 TanStack Query 캐시로(mobile/CLAUDE.md §2-4). 오프라인·앱 복귀를 Query에 알려 준다(§2-6).

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx는 다시 시도해도 같다 — 네트워크·5xx만 재시도
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      },
    },
  });
}

let wired = false;
/** 네트워크 연결·앱 포그라운드 복귀를 Query에 연결한다 (앱 시작 시 한 번) */
export function wireQueryEnvironment() {
  if (wired) return;
  wired = true;
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(!!state.isConnected)));
  AppState.addEventListener('change', (status: AppStateStatus) => focusManager.setFocused(status === 'active'));
}
