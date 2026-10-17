import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { useEffect, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { AuthProvider } from '@/auth/AuthProvider';
import type { Draft } from '@/state/draft';
import { DraftProvider, useDraft } from '@/state/DraftProvider';

/** 화면 테스트 공통 — 실제 Provider로 감싸고, API 모듈은 각 테스트에서 vi.mock으로 가짜로 바꾼다 */
/** 테스트에서 지금 초안을 들여다본다 */
export const draftRef: { current: Draft | null } = { current: null };
function DraftProbe() {
  const { draft } = useDraft();
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  return null;
}

export function renderWithProviders(ui: ReactElement, { route = '/', draft = null }: { route?: string; draft?: Draft | null } = {}) {
  draftRef.current = draft;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <DraftProvider initial={draft}>
            {ui}
            <DraftProbe />
          </DraftProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const testUser = { id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 2, standingSessionHours: 1 };
