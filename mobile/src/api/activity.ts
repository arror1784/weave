import { request } from './client';

/**
 * 앱 사용 기록(사용자 결정 2026-10-07) — 앱 열기·화면 보기·위젯 갱신을 모았다가 서버로 보낸다.
 * 프로젝트·작업·AI 챗봇 같은 기록은 서버가 직접 남긴다. 보내기에 실패하면 버리지 않고 다음에 다시 보낸다(최대 100개, 오래된 것부터 버림).
 */
export type ActivityType = 'APP_OPENED' | 'SCREEN_VIEWED' | 'WIDGET_RENDERED';

type PendingEvent = { type: ActivityType; occurredAt: string; detail: Record<string, unknown> };

const MAX_PENDING = 100;
const BATCH = 50;
let pending: PendingEvent[] = [];
let flushing: Promise<void> | null = null;

export function logActivity(type: ActivityType, detail: Record<string, unknown> = {}) {
  pending.push({ type, occurredAt: new Date().toISOString(), detail });
  if (pending.length > MAX_PENDING) pending = pending.slice(pending.length - MAX_PENDING);
}

/** 쌓인 기록을 50개씩 보낸다 — 이미 보내는 중이면 그 작업을 기다린다 */
export function flushActivity(): Promise<void> {
  flushing ??= (async () => {
    try {
      while (pending.length > 0) {
        const batch = pending.slice(0, BATCH);
        await request('/api/v1/activity/events', null, { method: 'POST', body: { events: batch } });
        pending = pending.slice(batch.length);
      }
    } catch {
      // 오프라인·서버 오류 — 남겨 두고 다음에 다시 보낸다
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** 로그아웃·탈퇴 때 기기에 남은 기록을 지운다(§3-18) */
export function clearActivity() {
  pending = [];
}

export function pendingActivityCount() {
  return pending.length;
}
