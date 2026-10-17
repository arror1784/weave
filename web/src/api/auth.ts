import { refreshSession, setAccessToken, webAuthPost } from './client';
import { webTokenSchema, type User } from './types';

/** 로그인 — 서버가 리프레시 토큰을 HttpOnly 쿠키로 심고, 액세스 토큰은 메모리에만 둔다 */
export async function login(email: string, password: string): Promise<User> {
  const tokens = await webAuthPost('/api/v1/auth/web/login', webTokenSchema, { email: email.trim(), password });
  setAccessToken(tokens.accessToken);
  return tokens.user;
}

/** 페이지를 새로 열었을 때 — 쿠키가 살아 있으면 로그인 상태로 되살린다 */
export async function restoreSession(): Promise<User | null> {
  return (await refreshSession())?.user ?? null;
}

/** 로그아웃 — 서버가 토큰을 폐기하고 쿠키를 지운다. 서버에 닿지 못해도 메모리 토큰은 지운다 */
export async function logout(): Promise<void> {
  try {
    await webAuthPost('/api/v1/auth/web/logout', null);
  } catch {
    // 오프라인이어도 화면에서는 로그아웃한다 — 쿠키는 다음 로그인 때 교체된다
  } finally {
    setAccessToken(null);
  }
}
