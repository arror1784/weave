import { request, upload } from './client';
import { attachmentSchema } from './types';

/** 파일·사진 올리기 — 서버가 형식·크기·사진 위치정보를 검사한다. 이름은 브라우저가 준 원래 파일 이름. 진행률(%)을 onProgress로 알린다 */
export function uploadAttachment(file: File, onProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append('file', file, file.name);
  return upload('/api/v1/attachments', attachmentSchema, form, onProgress);
}

export const addLink = (url: string) => request('/api/v1/attachments/links', attachmentSchema, { method: 'POST', body: { url } });

/** 아직 프로젝트에 연결하지 않은 첨부를 지운다(연결 안 된 첨부는 서버가 24시간 뒤 정리한다) */
export const deleteAttachment = (id: number) => request(`/api/v1/attachments/${id}`, null, { method: 'DELETE' });
