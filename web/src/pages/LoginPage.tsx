import { useState, type FormEvent } from 'react';

import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { Mark } from '@/components/brand';
import { IWarn } from '@/components/icons';
import { Btn, inputClass, Label, Spinner } from '@/components/ui';

/** W1 로그인 — 앱과 같은 계정. 소셜 로그인·회원가입은 없다(가입은 앱에서) */
export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, rememberMe);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-[1fr_minmax(480px,560px)]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-thread p-14 text-white">
        <span className="flex items-center gap-2.5">
          <span className="rounded-[10px] ring-1 ring-white/50">
            <Mark size={36} />
          </span>
          <span className="text-[20px] font-extrabold">Weave</span>
        </span>
        <svg className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.14]" width="560" height="560" viewBox="0 0 560 560" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={`v${i}`} d={`M${80 + i * 66} 0V560`} stroke="#fff" strokeWidth="10" />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={`h${i}`} d={`M0 ${80 + i * 66}H560`} className="stroke-thread-light" strokeWidth="10" />
          ))}
        </svg>
        <div className="relative max-w-[460px]">
          <p className="mb-4 text-[14px] font-semibold text-white/75">쪼개기 → 모으기 → 지키기</p>
          <p className="text-[40px] font-bold leading-[1.3] tracking-tight">
            긴 설명은 키보드로,
            <br />
            과제 공지는 바로 첨부.
          </p>
          <p className="mt-5 text-[16px] leading-relaxed text-white/85">
            PC에서 프로젝트를 등록하면 AI가 작업을 쪼개고, 모든 프로젝트를 하나의 일정으로 엮어 폰 앱에 보내 드려요.
          </p>
        </div>
        <p className="relative text-[13px] text-white/75">오늘 할 일과 일정 확인은 Weave 모바일 앱에서 할 수 있어요.</p>
      </section>
      <section className="flex items-center justify-center bg-white px-16">
        <form className="w-full max-w-[380px]" onSubmit={submit} noValidate>
          <h1 className="text-[28px] font-bold tracking-tight">로그인</h1>
          <p className="mt-2 text-[15px] text-ink-soft">모바일 앱과 같은 계정으로 로그인하세요.</p>
          <div className="mt-9 space-y-5">
            <div>
              <Label htmlFor="email">이메일</Label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} className={`${inputClass} h-12 ${error ? 'border-danger-text' : ''}`} />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                aria-describedby="login-error"
                className={`${inputClass} h-12 ${error ? 'border-danger-text' : ''}`}
              />
            </div>
          </div>
          <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-[14px] text-ink-soft">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="size-4 accent-thread" />
            로그인 상태 유지
          </label>
          <div id="login-error" className="mt-3 min-h-6">
            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-danger-text">
                <IWarn size={16} />
                {error}
              </p>
            )}
          </div>
          <Btn type="submit" disabled={busy || !email.trim() || !password} className="mt-3 h-12 w-full text-[16px]">
            {busy ? (
              <>
                <Spinner light label="로그인하는 중" />
                로그인하는 중…
              </>
            ) : (
              '로그인'
            )}
          </Btn>
        </form>
      </section>
    </main>
  );
}
