import { useNavigate } from 'react-router';

import { useAuth } from '@/auth/AuthProvider';

import { Logo } from './brand';
import { Btn } from './ui';

export function TopBar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-8">
        <button type="button" onClick={() => navigate('/')} aria-label="Weave 홈">
          <Logo />
        </button>
        <div className="flex items-center gap-4 text-[14px]">
          <span className="text-ink-soft">{user?.email}</span>
          <Btn kind="ghost" className="h-9 px-3 text-[14px]" onClick={() => signOut()}>
            로그아웃
          </Btn>
        </div>
      </div>
    </header>
  );
}
