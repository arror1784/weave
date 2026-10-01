import { request } from './client';
import { attachmentSchema } from './types';

/** 파일·사진 올리기 (서버가 형식·10MB·사진 위치정보를 검사) */
export function uploadAttachment(file: { uri: string; name: string; mimeType?: string | null }) {
  const form = new FormData();
  // React Native의 FormData는 { uri, name, type } 객체로 파일을 보낸다
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  return request('/api/v1/attachments', attachmentSchema, { method: 'POST', form });
}

export const addLink = (url: string) => request('/api/v1/attachments/links', attachmentSchema, { method: 'POST', body: { url } });

export const deleteAttachment = (id: number) => request(`/api/v1/attachments/${id}`, null, { method: 'DELETE' });
