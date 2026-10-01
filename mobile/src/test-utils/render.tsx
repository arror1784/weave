import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { useEffect, type ReactElement } from 'react';

import type { User } from '@/api/types';
import { AuthContextForTest } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/Toast';
import { CompletionPromptProvider, useCompletionPrompt } from '@/state/CompletionPrompt';
import type { Draft } from '@/state/draft';
import { DraftProvider, useDraft } from '@/state/DraftProvider';

export const TEST_TODAY = '2026-09-30'; // 수요일

/** 테스트에서 초안·완료 모달 상태를 들여다보는 창구 */
export const draftRef: { current: Draft | null } = { current: null };
export const completionRef: { current: { projectId: number; name: string } | null } = { current: null };

export const testAuth = {
  status: 'signedIn' as 'signedIn' | 'signedOut' | 'loading',
  user: { id: 1, email: 'me@example.com', dailyAvailableHours: 3 } as User | null,
  signIn: jest.fn(async () => {}),
  signUp: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
};

function Probe() {
  const { draft } = useDraft();
  const { pending } = useCompletionPrompt();
  useEffect(() => {
    draftRef.current = draft;
    completionRef.current = pending;
  }, [draft, pending]);
  return null;
}

type Options = { draft?: Draft | null; completion?: { projectId: number; name: string } | null; auth?: Partial<typeof testAuth> };

/** 화면 테스트용: Query(재시도 없음)·로그인 상태·등록 초안·완료 모달·토스트를 감싼다. API는 각 테스트에서 jest.mock('@/api/…') */
export async function renderWithProviders(ui: ReactElement, { draft = null, completion = null, auth }: Options = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <AuthContextForTest.Provider value={{ ...testAuth, ...auth }}>
        <DraftProvider initial={draft}>
          <CompletionPromptProvider initial={completion}>
            <ToastProvider>
              {ui}
              <Probe />
            </ToastProvider>
          </CompletionPromptProvider>
        </DraftProvider>
      </AuthContextForTest.Provider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
