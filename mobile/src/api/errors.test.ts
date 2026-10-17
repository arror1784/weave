import { z } from 'zod';

import { ApiError, NetworkError } from './client';
import { errorMessage } from './errors';

describe('오류 문구 — 원인별로 나눈다 (사용자 결정 2026-10-17)', () => {
  it('서버가 보낸 오류는 서버 메시지를 그대로 보여준다', () => {
    expect(errorMessage(new ApiError(400, 'BAD_REQUEST', '마감일을 확인해 주세요.'))).toBe('마감일을 확인해 주세요.');
  });

  it('서버에 닿지 못했으면 연결을 확인하라고 한다', () => {
    expect(errorMessage(new NetworkError())).toBe('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.');
  });

  it('그 밖의 오류(응답 형식 오류·앱 내부 오류)는 연결 문제라고 하지 않는다', () => {
    const parseError = (() => {
      try {
        z.object({ id: z.number() }).parse({});
      } catch (e) {
        return e;
      }
    })();
    for (const e of [parseError, new TypeError("Cannot read properties of undefined (reading 'id')"), 'x']) {
      expect(errorMessage(e)).toBe('앱에서 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.');
    }
  });
});
