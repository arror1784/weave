import { addDays, diffInDays, type DateKey } from './date';

// 작업 날짜는 서버가 임시 일정 알고리즘으로 정한다(backend Scheduler). 앱은 부하를 셀 때 쓰는 계산만 둔다.

/** 부하 계산에 필요한 작업 필드 */
export type ScheduledTaskLike = { scheduledDate: DateKey | null; spanDays: number; estimatedHours: number | null; done: boolean };

/** 작업이 끝나는 날 (시작일 + 기간 − 1) */
export function taskEndDate(task: Pick<ScheduledTaskLike, 'scheduledDate' | 'spanDays'>): DateKey | null {
  return task.scheduledDate ? addDays(task.scheduledDate, Math.max(1, task.spanDays) - 1) : null;
}

/** 그날 이 작업에 드는 시간 — 여러 날 작업은 기간에 똑같이 나눈다 */
export function taskHoursOn(task: ScheduledTaskLike, date: DateKey): number {
  if (!task.scheduledDate) return 0;
  const offset = diffInDays(task.scheduledDate, date);
  const span = Math.max(1, task.spanDays);
  return offset >= 0 && offset < span ? (task.estimatedHours ?? 0) / span : 0;
}
