import { addDays, diffInDays, type DateKey } from './date';

// 작업 날짜는 서버가 일정 알고리즘으로 정한다(backend Scheduler). 앱은 부하를 셀 때 쓰는 계산만 둔다.

export type DayHours = { date: DateKey; hours: number };

/** 부하 계산에 필요한 작업 필드 — days: 서버가 날짜별로 배정한 시간(하루에 최대한 채워 앞당긴다) */
export type ScheduledTaskLike = { scheduledDate: DateKey | null; spanDays: number; estimatedHours: number | null; done: boolean; days: DayHours[] };

/** 작업이 끝나는 날 — 날짜별 배정의 마지막 날, 없으면 시작일 + 기간 − 1 */
export function taskEndDate(task: Pick<ScheduledTaskLike, 'scheduledDate' | 'spanDays' | 'days'>): DateKey | null {
  const last = task.days.at(-1);
  if (last) return last.date;
  return task.scheduledDate ? addDays(task.scheduledDate, Math.max(1, task.spanDays) - 1) : null;
}

/** 그날 이 작업에 드는 시간 — 서버의 날짜별 배정을 그대로, 없으면 기간에 똑같이 나눈다 */
export function taskHoursOn(task: ScheduledTaskLike, date: DateKey): number {
  if (task.days.length > 0) return task.days.filter((d) => d.date === date).reduce((a, d) => a + d.hours, 0);
  if (!task.scheduledDate) return 0;
  const offset = diffInDays(task.scheduledDate, date);
  const span = Math.max(1, task.spanDays);
  return offset >= 0 && offset < span ? (task.estimatedHours ?? 0) / span : 0;
}
