import { request } from './client';
import { tokenStore } from './token-store';

jest.mock('./token-store', () => {
  let access: string | null = 'old-access';
  let refresh: string | null = 'refresh-1';
  return {
    tokenStore: {
      getAccess: () => access,
      setAccess: (t: string | null) => (access = t),
      getRefresh: jest.fn(async () => refresh),
      setRefresh: jest.fn(async (t: string) => {
        refresh = t;
      }),
      clear: jest.fn(async () => {
        access = null;
        refresh = null;
      }),
    },
  };
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('토큰 갱신 (앱 화면과 위젯이 함께 써도 안전하게)', () => {
  it('동시에 401이 여러 개 와도 리프레시는 한 번만 하고, 새 토큰으로 각각 다시 요청한다', async () => {
    const calls: string[] = [];
    globalThis.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'new-access', refreshToken: 'refresh-2', expiresIn: 900, user: { id: 1, email: 'me@example.com', dailyAvailableHours: 3 } });
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return auth === 'Bearer new-access' ? json(200, { ok: true }) : json(401, { code: 'UNAUTHORIZED', message: 'x' });
    }) as unknown as typeof fetch;

    await Promise.all([request('/api/v1/schedule', null), request('/api/v1/me', null)]);

    expect(calls.filter((u) => u.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(tokenStore.setRefresh).toHaveBeenCalledWith('refresh-2');
    expect(tokenStore.getAccess()).toBe('new-access');
  });
});
