import { request, saveTokens } from './client';
import { tokenStore } from './token-store';
import { tokenSchema, userSchema, type User } from './types';

export async function signup(email: string, password: string): Promise<User> {
  const tokens = await request('/api/v1/auth/signup', tokenSchema, { method: 'POST', body: { email, password }, auth: false });
  await saveTokens(tokens);
  return tokens.user;
}

export async function login(email: string, password: string): Promise<User> {
  const tokens = await request('/api/v1/auth/login', tokenSchema, { method: 'POST', body: { email, password }, auth: false });
  await saveTokens(tokens);
  return tokens.user;
}

/** 서버에서 리프레시 토큰을 폐기하고 기기 토큰을 지운다. 서버 호출이 실패해도 기기 토큰은 지운다. */
export async function logout(): Promise<void> {
  const refreshToken = await tokenStore.getRefresh();
  try {
    if (refreshToken) await request('/api/v1/auth/logout', null, { method: 'POST', body: { refreshToken } });
  } finally {
    await tokenStore.clear();
  }
}

export const getMe = () => request('/api/v1/me', userSchema);

export const updateSettings = (dailyAvailableHours: number) =>
  request('/api/v1/me/settings', userSchema, { method: 'PATCH', body: { dailyAvailableHours } });

/** 탈퇴 — 서버가 개인정보를 실제로 지운다. 이어서 기기 토큰도 지운다. */
export async function deleteAccount(): Promise<void> {
  await request('/api/v1/me', null, { method: 'DELETE' });
  await tokenStore.clear();
}
