import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_URL, ApiError, refreshSession, request } from './client';
import { tokenStore } from './token-store';
import { attachmentSchema, type Attachment } from './types';

/** 파일·사진 올리기 (서버가 형식·10MB·사진 위치정보를 검사) */
export function uploadAttachment(file: { uri: string; name: string; mimeType?: string | null }) {
  const form = new FormData();
  // Expo의 fetch(SDK 57이 전역 fetch를 바꿔 둔다)는 React Native식 { uri } 파일을 보내지 못한다 —
  // "Unsupported FormDataPart implementation"으로 요청 전에 실패했다. 파일 내용은 bytes()로 읽어 보낸다.
  // 이름은 기기 캐시 경로가 아닌 원래 파일 이름을 쓴다.
  const part = { name: file.name, type: file.mimeType ?? 'application/octet-stream', bytes: () => new File(file.uri).bytes() };
  form.append('file', part as unknown as Blob);
  return request('/api/v1/attachments', attachmentSchema, { method: 'POST', form });
}

export const addLink = (url: string) => request('/api/v1/attachments/links', attachmentSchema, { method: 'POST', body: { url } });

export const deleteAttachment = (id: number) => request(`/api/v1/attachments/${id}`, null, { method: 'DELETE' });

/**
 * 첨부 파일 내려받기 → 기기의 공유 창으로 연다(저장·다른 앱으로 열기). 토큰이 만료됐으면 한 번 갱신하고 다시 받는다.
 */
export async function downloadAttachment(attachment: Attachment): Promise<void> {
  const target = new File(Paths.cache, `${attachment.id}-${safeName(attachment.name)}`);
  const download = () =>
    File.downloadFileAsync(`${API_URL}/api/v1/attachments/${attachment.id}/content`, target, {
      headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ''}` },
      idempotent: true,
    });
  let file: File;
  try {
    file = await download();
  } catch {
    if (!(await refreshSession())) throw new ApiError(401, 'UNAUTHORIZED', '다시 로그인해 주세요.');
    file = await download();
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: attachment.contentType });
}

/** 기기 파일 이름으로 쓸 수 없는 글자를 바꾼다 */
function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}
