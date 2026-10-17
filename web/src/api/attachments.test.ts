import { uploadAttachment } from './attachments';

it('파일은 FormData의 file로 원래 이름 그대로 올리고, 응답을 첨부로 돌려준다', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 7, kind: 'file', name: '과제 공지.pdf', size: 3 }), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['abc'], '과제 공지.pdf', { type: 'application/pdf' });
  expect(await uploadAttachment(file)).toMatchObject({ id: 7, name: '과제 공지.pdf' });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/v1/attachments');
  expect(init.method).toBe('POST');
  const sent = (init.body as FormData).get('file') as File;
  expect(sent.name).toBe('과제 공지.pdf');
  // multipart 경계는 브라우저가 정한다 — Content-Type을 직접 넣지 않는다
  expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
});
