import { request } from './client';
import { clearActivity, flushActivity, logActivity, pendingActivityCount } from './activity';

jest.mock('./client', () => ({ request: jest.fn(async () => null) }));
const send = jest.mocked(request);

beforeEach(() => {
  jest.clearAllMocks();
  clearActivity();
});

describe('앱 사용 기록 보내기 (사용자 결정 2026-10-07)', () => {
  it('기록을 모았다가 한 번에 서버로 보낸다 — 종류·시각·내용', async () => {
    logActivity('APP_OPENED');
    logActivity('SCREEN_VIEWED', { path: '/projects/3' });
    await flushActivity();
    expect(send).toHaveBeenCalledTimes(1);
    const [path, schema, options] = send.mock.calls[0];
    expect(path).toBe('/api/v1/activity/events');
    expect(schema).toBeNull();
    const body = (options as { method: string; body: { events: { type: string; occurredAt: string; detail: object }[] } });
    expect(body.method).toBe('POST');
    expect(body.body.events.map((e) => e.type)).toEqual(['APP_OPENED', 'SCREEN_VIEWED']);
    expect(body.body.events[1].detail).toEqual({ path: '/projects/3' });
    expect(Number.isNaN(Date.parse(body.body.events[0].occurredAt))).toBe(false);
    expect(pendingActivityCount()).toBe(0);
  });

  it('보내기에 실패하면(오프라인 등) 기록을 버리지 않고 다음에 다시 보낸다', async () => {
    send.mockRejectedValueOnce(new Error('offline'));
    logActivity('APP_OPENED');
    await flushActivity();
    expect(pendingActivityCount()).toBe(1);
    await flushActivity();
    expect(send).toHaveBeenCalledTimes(2);
    expect(pendingActivityCount()).toBe(0);
  });

  it('한 번에 50개씩 보내고, 쌓인 기록은 100개까지만 둔다(오래된 것부터 버림)', async () => {
    for (let i = 0; i < 120; i += 1) logActivity('SCREEN_VIEWED', { path: `/${i}` });
    expect(pendingActivityCount()).toBe(100);
    await flushActivity();
    const sizes = send.mock.calls.map((c) => (c[2] as { body: { events: unknown[] } }).body.events.length);
    expect(sizes).toEqual([50, 50]);
    expect((send.mock.calls[0][2] as { body: { events: { detail: { path: string } }[] } }).body.events[0].detail.path).toBe('/20');
  });

  it('보낼 기록이 없으면 요청하지 않고, 로그아웃 때 비울 수 있다', async () => {
    await flushActivity();
    expect(send).not.toHaveBeenCalled();
    logActivity('APP_OPENED');
    clearActivity();
    expect(pendingActivityCount()).toBe(0);
  });
});
