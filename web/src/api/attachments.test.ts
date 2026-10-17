import { uploadAttachment } from './attachments';
import { ApiError, NetworkError, setAccessToken } from './client';

/** 진행률은 fetch로 알 수 없어 업로드만 XMLHttpRequest로 보낸다(사용자 결정 2026-10-18) — 테스트는 가짜 XHR로 */
class FakeXhr {
  static sent: FakeXhr[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null = null;
  withCredentials = false;
  status = 0;
  responseText = '';
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: FormData) {
    this.body = body;
    FakeXhr.sent.push(this);
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }
}

const saved = { id: 7, kind: 'file', name: '과제 공지.pdf', size: 3 };
const pdf = () => new File(['abc'], '과제 공지.pdf', { type: 'application/pdf' });
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  FakeXhr.sent = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  setAccessToken('access-1');
});

it('파일은 FormData의 file로 원래 이름 그대로 Bearer와 함께 올리고, 진행률(%)을 알려 준 뒤 첨부를 돌려준다', async () => {
  const progress: number[] = [];
  const done = uploadAttachment(pdf(), (p) => progress.push(p));
  const xhr = FakeXhr.sent[0];
  expect([xhr.method, xhr.url]).toEqual(['POST', '/api/v1/attachments']);
  expect(xhr.headers.Authorization).toBe('Bearer access-1');
  // multipart 경계는 브라우저가 정한다 — Content-Type을 직접 넣지 않는다
  expect(xhr.headers['Content-Type']).toBeUndefined();
  expect((xhr.body!.get('file') as File).name).toBe('과제 공지.pdf');
  xhr.upload.onprogress?.({ lengthComputable: true, loaded: 31, total: 100 });
  xhr.upload.onprogress?.({ lengthComputable: false, loaded: 50, total: 0 });
  xhr.respond(201, saved);
  expect(await done).toMatchObject({ id: 7, name: '과제 공지.pdf' });
  expect(progress).toEqual([31]);
});

it('401이면 토큰을 한 번 갱신하고 새 토큰으로 다시 올린다', async () => {
  document.cookie = 'XSRF-TOKEN=xsrf-1; path=/';
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ accessToken: 'access-2', expiresIn: 900, user: { id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 2, standingSessionHours: 1 } }), { status: 200 })));
  const done = uploadAttachment(pdf());
  FakeXhr.sent[0].respond(401, { code: 'UNAUTHORIZED', message: '로그인이 필요해요.' });
  await vi.waitFor(() => expect(FakeXhr.sent).toHaveLength(2));
  expect(FakeXhr.sent[1].headers.Authorization).toBe('Bearer access-2');
  FakeXhr.sent[1].respond(201, saved);
  expect(await done).toMatchObject({ id: 7 });
});

it('서버가 거절하면 { code, message }로 ApiError, 서버에 닿지 못하면 NetworkError', async () => {
  const rejected = uploadAttachment(pdf());
  FakeXhr.sent[0].respond(400, { code: 'FILE_REJECTED', message: '올릴 수 없는 형식이에요.' });
  await expect(rejected).rejects.toMatchObject({ status: 400, code: 'FILE_REJECTED', message: '올릴 수 없는 형식이에요.' });
  await expect(rejected).rejects.toBeInstanceOf(ApiError);

  const offline = uploadAttachment(pdf());
  await tick();
  FakeXhr.sent[1].onerror?.();
  await expect(offline).rejects.toBeInstanceOf(NetworkError);
});
