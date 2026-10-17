import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { Spinner } from '@/components/ui';
import { ChatPage } from '@/pages/ChatPage';
import { DonePage } from '@/pages/DonePage';
import { HomePage } from '@/pages/HomePage';
import { InfoPage, ReplanStartPage } from '@/pages/InfoPage';
import { LoginPage } from '@/pages/LoginPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { DraftProvider } from '@/state/DraftProvider';

/**
 * 화면 주소. 웹 범위는 등록 + AI 재요청(사용자 결정 2026-10-17).
 * /login(W1) · /(W2 홈) · /new(W3 기본 정보) · /new/chat(W4) · /new/review(W5) · /new/done(W6) · /projects/:id/replan(재요청 → W3)
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/" element={<SignedIn><HomePage /></SignedIn>} />
      <Route path="/new" element={<SignedIn><InfoPage /></SignedIn>} />
      <Route path="/new/chat" element={<SignedIn><ChatPage /></SignedIn>} />
      <Route path="/new/review" element={<SignedIn><ReviewPage /></SignedIn>} />
      <Route path="/new/done" element={<SignedIn><DonePage /></SignedIn>} />
      <Route path="/projects/:id/replan" element={<SignedIn><ReplanStartPage /></SignedIn>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function SignedIn({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  return status === 'signedIn' ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  return status === 'signedIn' ? <Navigate to="/" replace /> : children;
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner size={32} />
    </div>
  );
}

export function App() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  useOnlineManager();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <DraftProvider>
            <AppRoutes />
          </DraftProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/** 브라우저 온라인 상태가 바뀌면 화면이 다시 그려지게(오프라인 표시는 각 화면의 NetworkError로) */
function useOnlineManager() {
  const [, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
}
