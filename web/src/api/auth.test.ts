import { getAccessToken, setAccessToken } from './client';
import { login, logout, restoreSession } from './auth';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const user = { id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 2, standingSessionHours: 1 };

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=xsrf; path=/';
});

it('로그인: 웹 로그인 경로로 보내고(CSRF 헤더) 액세스 토큰을 메모리에 둔다', async () => {
  const fetchMock = vi.fn(async () => json(200, { accessToken: 'a1', expiresIn: 900, user }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await login(' Me@Example.com ', 'weave2026!')).toEqual(user);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/v1/auth/web/login');
  expect(JSON.parse(init.body as string)).toEqual({ email: 'Me@Example.com', password: 'weave2026!' });
  expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('xsrf');
  expect(getAccessToken()).toBe('a1');
});

it('페이지를 새로 열면 쿠키로 갱신해 로그인 상태를 되살린다 — 쿠키가 없으면 null', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json(200, { accessToken: 'a2', expiresIn: 900, user })));
  expect(await restoreSession()).toEqual(user);
  vi.stubGlobal('fetch', vi.fn(async () => json(401, { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요.' })));
  expect(await restoreSession()).toBeNull();
});

it('로그아웃: 서버가 쿠키를 지우고, 메모리 토큰도 지운다 — 서버에 닿지 못해도 기기에서는 로그아웃', async () => {
  setAccessToken('signed-in');
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
  await logout();
  expect(getAccessToken()).toBeNull();
});
