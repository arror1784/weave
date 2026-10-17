import { ApiError, NetworkError } from './client';

/** 사용자에게 보여줄 오류 문장 — 앱(mobile/src/api/errors.ts)과 같은 기준: 서버 메시지 / 연결 실패 / 그 밖 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
  return '앱에서 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.';
}
