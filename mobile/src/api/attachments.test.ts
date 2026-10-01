import { File } from 'expo-file-system';

import { uploadAttachment } from './attachments';

const MockFile = jest.mocked(File);
type Part = { name: string; type: string; bytes: () => Promise<Uint8Array>; uri?: string };

describe('첨부 올리기', () => {
  let appended: [string, Part][];

  beforeEach(() => {
    appended = [];
    // 테스트 환경의 FormData는 기기와 달라서, 무엇을 넣었는지는 append 인자로 확인한다
    jest.spyOn(FormData.prototype, 'append').mockImplementation((key: string, value: unknown) => {
      appended.push([key, value as Part]);
    });
    globalThis.fetch = jest.fn(async () => new Response(JSON.stringify({ id: 7, kind: 'file', name: '노트.md', contentType: 'text/markdown', size: 3 }), { status: 201 }));
  });

  afterEach(() => jest.restoreAllMocks());

  it('파일은 bytes()로 읽는 형태로 보낸다 — Expo의 fetch는 React Native식 { uri } 파일을 보내지 못한다', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    MockFile.mockImplementation(() => ({ bytes: jest.fn(async () => bytes) }) as unknown as File);

    await uploadAttachment({ uri: 'file:///cache/DocumentPicker/abc.md', name: '노트.md', mimeType: 'text/markdown' });

    const [key, part] = appended[0];
    expect(key).toBe('file');
    expect(part.uri).toBeUndefined();
    // 원래 파일 이름과 형식을 그대로 — 기기 캐시 경로의 이름(abc.md)이 아니라
    expect(part.name).toBe('노트.md');
    expect(part.type).toBe('text/markdown');
    expect(await part.bytes()).toBe(bytes);
    expect(MockFile).toHaveBeenCalledWith('file:///cache/DocumentPicker/abc.md');
  });

  it('형식을 모르면 application/octet-stream으로 보낸다', async () => {
    MockFile.mockImplementation(() => ({ bytes: jest.fn(async () => new Uint8Array()) }) as unknown as File);
    await uploadAttachment({ uri: 'file:///cache/x.bin', name: 'x.bin', mimeType: null });
    expect(appended[0][1].type).toBe('application/octet-stream');
  });
});
