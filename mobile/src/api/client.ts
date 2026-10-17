import type { z } from 'zod';

import { tokenSchema, type Tokens } from './types';
import { tokenStore } from './token-store';

// 모든 API 호출은 여기를 거친다(mobile/CLAUDE.md §2-3). 화면에서 fetch를 직접 부르지 않는다.
// 주소는 EXPO_PUBLIC_API_URL — 폰·에뮬레이터 모두 USB + adb reverse로 localhost:8080에 접속한다(§2-11).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

/** 서버 오류 응답 { code, message, fieldErrors } */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** 서버에 닿지 못함(오프라인·서버 꺼짐·adb reverse 끊김 등) — fetch 자체가 실패했을 때 */
export class NetworkError extends Error {
  constructor() {
    super('network request failed');
  }
}

/** 리프레시가 실패해 다시 로그인해야 할 때 부른다(AuthProvider가 등록) */
let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

type Options = { method?: string; body?: unknown; form?: FormData; auth?: boolean };

export async function request<T>(path: string, schema: z.ZodType<T> | null, { method = 'GET', body, form, auth = true }: Options = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = tokenStore.getAccess();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) }).catch(() => {
      throw new NetworkError();
    });
  };

  let response = await send();
  if (response.status === 401 && auth) {
    // 액세스 토큰 만료 → 한 번만 갱신하고 다시 시도
    if (await refreshSession()) response = await send();
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204 || schema === null) return undefined as T;
  return schema.parse(await response.json());
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return new ApiError(response.status, data.code ?? 'UNKNOWN', data.message ?? '요청을 처리하지 못했어요.', data.fieldErrors ?? {});
  } catch {
    return new ApiError(response.status, 'UNKNOWN', '요청을 처리하지 못했어요.');
  }
}

/**
 * 토큰 갱신은 한 번에 하나만(루트 CLAUDE.md §3-3) — 동시에 401이 여러 개 와도 같은 Promise를 기다린다.
 * 안 그러면 두 번째 갱신이 이미 교체된 토큰을 보내 "재사용"으로 판정되고 강제 로그아웃된다.
 */
let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) return false;
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        await tokenStore.clear();
        onSessionExpired();
        return false;
      }
      await saveTokens(tokenSchema.parse(await response.json()));
      return true;
    } catch {
      // 네트워크 오류는 로그아웃시키지 않는다(오프라인일 수 있음)
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function saveTokens(tokens: Tokens) {
  tokenStore.setAccess(tokens.accessToken);
  await tokenStore.setRefresh(tokens.refreshToken);
}
