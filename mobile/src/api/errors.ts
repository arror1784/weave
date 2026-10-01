import { ApiError } from './client';

/** 사용자에게 보여줄 오류 문장 — 서버 메시지를 그대로 쓰고, 연결 실패는 따로 안내한다 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
}
