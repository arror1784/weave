import { ApiError, NetworkError, refreshSession, request, setAccessToken, setSessionExpiredHandler } from './client';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const user = { id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 2, standingSessionHours: 1 };

function setCookie(value: string) {
  document.cookie = value;
}

beforeEach(() => {
  setAccessToken(null);
  setCookie('XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/');
  vi.restoreAllMocks();
});

describe('request', () => {
  it('메모리의 액세스 토큰을 Bearer로 붙이고, 응답을 스키마로 검증한다', async () => {
    setAccessToken('access-1');
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/v1/me', null);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });

  it('서버 오류는 { code, message }로 ApiError를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(409, { code: 'EMAIL_TAKEN', message: '이미 가입한 이메일이에요.' })));
    await expect(request('/api/v1/x', null)).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN', message: '이미 가입한 이메일이에요.' });
    await expect(request('/api/v1/x', null)).rejects.toBeInstanceOf(ApiError);
  });

  it('fetch 자체가 실패하면(서버에 닿지 못함) NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(request('/api/v1/x', null)).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('토큰 갱신 (리프레시 토큰은 HttpOnly 쿠키 — 스크립트는 보지 못한다)', () => {
  it('동시에 401이 여러 개 와도 갱신은 한 번만 하고, 새 토큰으로 각각 다시 요청한다', async () => {
    setCookie('XSRF-TOKEN=xsrf-1; path=/');
    setAccessToken('old');
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url === '/api/v1/auth/web/refresh') return json(200, { accessToken: 'new', expiresIn: 900, user });
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return auth === 'Bearer new' ? json(200, {}) : json(401, { code: 'UNAUTHORIZED', message: 'x' });
    }));
    await Promise.all([request('/api/v1/a', null), request('/api/v1/b', null)]);
    expect(calls.filter((u) => u === '/api/v1/auth/web/refresh')).toHaveLength(1);
  });

  it('갱신 요청에는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다', async () => {
    setCookie('XSRF-TOKEN=xsrf-abc; path=/');
    const fetchMock = vi.fn(async () => json(200, { accessToken: 'new', expiresIn: 900, user }));
    vi.stubGlobal('fetch', fetchMock);
    await refreshSession();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/web/refresh');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('xsrf-abc');
  });

  it('XSRF-TOKEN 쿠키가 없으면 먼저 /csrf로 받아 온다', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url === '/api/v1/auth/web/csrf') {
        setCookie('XSRF-TOKEN=issued; path=/');
        return new Response(null, { status: 204 });
      }
      return json(200, { accessToken: 'new', expiresIn: 900, user });
    }));
    await refreshSession();
    expect(calls).toEqual(['/api/v1/auth/web/csrf', '/api/v1/auth/web/refresh']);
  });

  it('갱신이 거절되면 세션 만료를 알리고 null', async () => {
    setCookie('XSRF-TOKEN=x; path=/');
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    vi.stubGlobal('fetch', vi.fn(async () => json(401, { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요.' })));
    await expect(refreshSession()).resolves.toBeNull();
    expect(expired).toHaveBeenCalled();
  });

  it('갱신 중 연결이 끊기면 로그아웃시키지 않는다(오프라인일 수 있음)', async () => {
    setCookie('XSRF-TOKEN=x; path=/');
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(refreshSession()).resolves.toBeNull();
    expect(expired).not.toHaveBeenCalled();
  });
});
