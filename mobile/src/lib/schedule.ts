import type { Project, Task } from '@/api/types';

import { addDays, diffInDays, weekDays, type DateKey } from './date';
import { taskEndDate, taskHoursOn } from './scheduler';

// 일정 화면들이 쓰는 계산. 서버 스냅샷(GET /api/v1/schedule)을 그대로 받아 쓴다 — 날짜는 서버가 정한다.

export type ScheduleData = { projects: Project[]; tasks: Task[]; dailyAvailableHours: number };
export type Tone = 'soft' | 'near' | 'over';

const hoursOf = (t: Task) => t.estimatedHours ?? 0;
const round = (n: number) => Number(n.toFixed(2));

/** 끝나는 날(시작일 + 기간 − 1)이 지났는데 완료되지 않은 작업 */
export function isOverdue(task: Task, today: DateKey): boolean {
  const end = taskEndDate(task);
  return !task.done && end !== null && end < today;
}

/** 그날이 작업 기간(시작일 ~ 끝나는 날)에 들어가는지 */
function coversDate(task: Task, date: DateKey): boolean {
  const end = taskEndDate(task);
  return task.scheduledDate !== null && task.scheduledDate <= date && end !== null && date <= end;
}

export function selectOverdueTasks(data: ScheduleData, today: DateKey): Task[] {
  return data.tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
}

/** 오늘 할 일: 오늘이 기간에 들어가는 작업 + 밀린 작업. 지연 → 마감 가까운 순 → 완료는 맨 뒤 */
export function selectTodayTasks(data: ScheduleData, today: DateKey): Task[] {
  const list = data.tasks.filter((t) => coversDate(t, today) || isOverdue(t, today));
  const rank = (t: Task) => (t.done ? 2 : isOverdue(t, today) ? 0 : 1);
  return list.sort((a, b) => rank(a) - rank(b) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

/** 정상 soft / 임박(D-1~D-Day) near / 지연 over */
export function taskTone(task: Task, today: DateKey): Tone {
  if (task.done || !task.dueDate) return 'soft';
  const remaining = diffInDays(today, task.dueDate);
  if (remaining < 0) return 'over';
  return remaining <= 1 ? 'near' : 'soft';
}

/** 하루 부하: 그날 몫(여러 날 작업은 하루 몫). includeOverdue면(오늘 화면) 밀린 작업 시간 전부를 더한다 */
export function selectDayLoad(data: ScheduleData, date: DateKey, { includeOverdue = false } = {}) {
  const planned = data.tasks.reduce((a, t) => a + taskHoursOn(t, date), 0);
  const overdue = includeOverdue ? selectOverdueTasks(data, date).reduce((a, t) => a + hoursOf(t), 0) : 0;
  const hours = round(planned + overdue);
  const capacity = data.dailyAvailableHours;
  return { hours, capacity, over: hours > capacity };
}

export type DayItem = { kind: 'task' | 'due'; projectId: number; title: string; hours: number; due: boolean; taskId?: number };

/** 날짜별 항목(달력용): 그날이 기간에 들어가는 작업(하루 몫 시간) + 그날 마감인 프로젝트 */
export function selectDayItems(data: ScheduleData, date: DateKey): DayItem[] {
  const tasks: DayItem[] = data.tasks
    .filter((t) => coversDate(t, date))
    .map((t) => ({ kind: 'task', projectId: t.projectId, title: t.title, hours: round(taskHoursOn(t, date)), due: false, taskId: t.id }));
  const dues: DayItem[] = data.projects
    .filter((p) => p.deadline === date)
    .map((p) => ({ kind: 'due', projectId: p.id, title: `${p.name} 마감`, hours: 0, due: true }));
  return [...tasks, ...dues];
}

/** 이번 주(오늘~일요일) 부하: 남은 작업 몫 + 밀린 작업 vs 하루 가용 시간 × 남은 날 수. 작업은 시간 큰 순 */
export function selectWeekLoad(data: ScheduleData, today: DateKey) {
  const days = weekDays(today).filter((d) => d >= today);
  const overdue = selectOverdueTasks(data, today);
  const upcoming = data.tasks.filter((t) => !t.done && !isOverdue(t, today) && days.some((d) => coversDate(t, d)));
  const estimated = round(overdue.reduce((a, t) => a + hoursOf(t), 0) + upcoming.reduce((a, t) => a + days.reduce((b, d) => b + taskHoursOn(t, d), 0), 0));
  const tasks = [...overdue, ...upcoming].sort((a, b) => hoursOf(b) - hoursOf(a));
  return { estimated, available: data.dailyAvailableHours * days.length, tasks };
}

/** 프로젝트 일정(간트)에 보여줄 날짜 범위: 오늘 이틀 전부터 9일 */
export function selectGanttRange(today: DateKey): DateKey[] {
  return Array.from({ length: 9 }, (_, i) => addDays(today, i - 2));
}
