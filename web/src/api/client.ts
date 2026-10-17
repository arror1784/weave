import type { z } from 'zod';

import { webTokenSchema, type WebTokens } from './types';

// 모든 API 호출은 여기를 거친다. 화면에서 fetch를 직접 부르지 않는다.
// 웹과 API는 같은 주소(origin)라 경로만 쓴다 — 개발은 Vite가, 배포는 Caddy가 /api를 서버로 넘긴다.
// 루트 CLAUDE.md §3-2: 리프레시 토큰은 서버가 주는 HttpOnly 쿠키(스크립트가 못 읽음), 액세스 토큰은 이 모듈의 메모리에만.

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

/** 서버에 닿지 못함(오프라인·서버 꺼짐) — fetch 자체가 실패했을 때 */
export class NetworkError extends Error {
  constructor() {
    super('network request failed');
  }
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export const getAccessToken = () => accessToken;

/** 갱신이 거절돼 다시 로그인해야 할 때 부른다(AuthProvider가 등록) */
let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

type Options = { method?: string; body?: unknown; auth?: boolean };

export async function request<T>(path: string, schema: z.ZodType<T> | null, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetchOrNetworkError(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
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

/**
 * 파일 올리기 — 진행률(%)을 알려 주려고 XMLHttpRequest로 보낸다(fetch는 업로드 진행을 알 수 없다, 사용자 결정 2026-10-18).
 * 토큰·401 한 번 갱신·오류 모양은 request()와 같다.
 */
export async function upload<T>(path: string, schema: z.ZodType<T>, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  let response = await sendXhr(path, form, onProgress);
  if (response.status === 401) {
    if (await refreshSession()) response = await sendXhr(path, form, onProgress);
  }
  if (!response.ok) throw await toError(response);
  return schema.parse(await response.json());
}

function sendXhr(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.withCredentials = false; // 같은 주소라 쿠키는 기본으로 간다 — 다른 주소로는 보내지 않는다
    xhr.setRequestHeader('Accept', 'application/json');
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve(new Response(xhr.responseText || null, { status: xhr.status }));
    xhr.onerror = () => reject(new NetworkError());
    xhr.send(form);
  });
}

/** 웹 인증 경로(쿠키를 쓰는 곳) — 서버가 이 경로에만 CSRF를 켠다. XSRF-TOKEN 쿠키 값을 헤더로 함께 보낸다 */
export async function webAuthPost<T>(path: string, schema: z.ZodType<T> | null, body?: unknown): Promise<T> {
  const xsrf = await ensureXsrfToken();
  const headers: Record<string, string> = { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetchOrNetworkError(path, { method: 'POST', headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (!response.ok) throw await toError(response);
  if (response.status === 204 || schema === null) return undefined as T;
  return schema.parse(await response.json());
}

/**
 * 토큰 갱신은 한 번에 하나만(루트 CLAUDE.md §3-3) — 동시에 401이 여러 개 와도 같은 Promise를 기다린다.
 * 안 그러면 두 번째 갱신이 이미 교체된 쿠키를 보내 "재사용"으로 판정되고 강제 로그아웃된다.
 * 성공하면 새 토큰 응답, 실패하면 null.
 */
let refreshing: Promise<WebTokens | null> | null = null;

export function refreshSession(): Promise<WebTokens | null> {
  refreshing ??= (async () => {
    try {
      const tokens = await webAuthPost('/api/v1/auth/web/refresh', webTokenSchema);
      setAccessToken(tokens.accessToken);
      return tokens;
    } catch (e) {
      // 연결이 끊긴 것은 로그아웃시키지 않는다(오프라인일 수 있음)
      if (e instanceof ApiError) {
        setAccessToken(null);
        onSessionExpired();
      }
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function ensureXsrfToken(): Promise<string> {
  const existing = readCookie('XSRF-TOKEN');
  if (existing) return existing;
  await fetchOrNetworkError('/api/v1/auth/web/csrf', { method: 'GET' });
  return readCookie('XSRF-TOKEN') ?? '';
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const found = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  const value = found?.slice(prefix.length);
  return value ? decodeURIComponent(value) : null;
}

async function fetchOrNetworkError(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(path, { ...init, credentials: 'same-origin' });
  } catch {
    throw new NetworkError();
  }
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return new ApiError(response.status, data.code ?? 'UNKNOWN', data.message ?? '요청을 처리하지 못했어요.', data.fieldErrors ?? {});
  } catch {
    return new ApiError(response.status, 'UNKNOWN', '요청을 처리하지 못했어요.');
  }
}
