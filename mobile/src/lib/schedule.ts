import type { EventOccurrence, Project, Task } from '@/api/types';

import { addDays, diffInDays, weekDays, type DateKey } from './date';
import { taskEndDate, taskHoursOn } from './scheduler';

// 일정 화면들이 쓰는 계산. 서버 스냅샷(GET /api/v1/schedule)을 그대로 받아 쓴다 — 날짜는 서버가 정한다.

/** 요일별·공휴일 값이 없으면(옛 서버 응답) 오늘 가용 시간(dailyAvailableHours)을 매일 쓴다 */
export type ScheduleData = {
  projects: Project[];
  tasks: Task[];
  dailyAvailableHours: number;
  weeklyAvailableHours?: number[];
  holidayAvailableHours?: number;
  holidays?: DateKey[];
  /** 서버가 계산한 날짜별 가용 시간(요일·공휴일 − 개인 일정) — 있으면 이 값이 우선 */
  availableHoursByDate?: Record<DateKey, number>;
  /** 날짜별 개인 일정(표시용) */
  events?: EventOccurrence[];
};
export type Tone = 'soft' | 'near' | 'over';

const hoursOf = (t: Task) => t.estimatedHours ?? 0;

/**
 * 그날 가용 시간(사용자 결정 2026-10-17): 서버가 계산해 준 날짜별 값(요일·공휴일 − 개인 일정, backend AvailabilityService)을 쓴다.
 * 그 범위 밖이거나 옛 응답이면: 공휴일이면 공휴일 값, 아니면 요일 값(월요일부터 7개). 0이면 쉬는 날.
 */
export function capacityOn(data: ScheduleData, date: DateKey): number {
  const fromServer = data.availableHoursByDate?.[date];
  if (fromServer !== undefined) return fromServer;
  const weekly = data.weeklyAvailableHours;
  if (!weekly || weekly.length !== 7) return data.dailyAvailableHours;
  if (data.holidays?.includes(date) && data.holidayAvailableHours !== undefined) return data.holidayAvailableHours;
  const [y, m, d] = date.split('-').map(Number);
  return weekly[(new Date(y, m - 1, d).getDay() + 6) % 7];
}
const round = (n: number) => Number(n.toFixed(2));

/**
 * 지연(밀린) 작업: 서버가 오늘로 옮기며 원래 끝나는 날을 남긴 작업(delayedFrom),
 * 또는 아직 옮기기 전인데 끝나는 날이 지난 작업. 미완료만.
 */
export function isOverdue(task: Task, today: DateKey): boolean {
  return !task.done && (task.delayedFrom !== null || isUnmoved(task, today));
}

/** 끝나는 날이 지났는데 서버가 아직 오늘로 옮기지 않은 작업 — 부하에 '추가'로 더한다 */
function isUnmoved(task: Task, today: DateKey): boolean {
  const end = taskEndDate(task);
  return !task.done && end !== null && end < today;
}

/** 그날이 작업 기간에 들어가는지 — 서버가 날짜별로 배정했으면 배정된 날만(사이에 빈 날이 있을 수 있다) */
function coversDate(task: Task, date: DateKey): boolean {
  if (task.days.length > 0) return task.days.some((d) => d.date === date);
  const end = taskEndDate(task);
  return task.scheduledDate !== null && task.scheduledDate <= date && end !== null && date <= end;
}

const delayKey = (t: Task) => t.delayedFrom ?? taskEndDate(t) ?? '9999';

export function selectOverdueTasks(data: ScheduleData, today: DateKey): Task[] {
  return data.tasks.filter((t) => isOverdue(t, today)).sort((a, b) => delayKey(a).localeCompare(delayKey(b)));
}

/** 밀렸던 작업인지 — 완료 여부와 상관없이 (오늘 할 일 순서가 체크로 바뀌지 않게) */
function wasDelayed(task: Task, today: DateKey): boolean {
  const end = taskEndDate(task);
  return task.delayedFrom !== null || (end !== null && end < today);
}

/**
 * 오늘 할 일: 오늘이 기간에 들어가는 작업 + 밀린 작업. 지연 → 마감 가까운 순.
 * 완료 여부로는 순서를 바꾸지 않는다 — 체크해도 그 자리에 있다(사용자 결정 2026-10-01, Figma의 "완료는 맨 뒤"에서 바꿈).
 */
export function selectTodayTasks(data: ScheduleData, today: DateKey): Task[] {
  // 지난 날짜의 작업은 아직 안 끝낸(밀린) 것만 — 서버가 밀린 작업을 오늘로 옮기므로 체크해도 목록에 남는다
  const list = data.tasks.filter((t) => coversDate(t, today) || isOverdue(t, today));
  const rank = (t: Task) => (wasDelayed(t, today) ? 0 : 1);
  const order = (t: Task) => (rank(t) === 0 ? delayKey(t) : (t.dueDate ?? '9999'));
  return list.sort((a, b) => rank(a) - rank(b) || order(a).localeCompare(order(b)) || a.id - b.id);
}

/** 정상 soft / 임박(D-1~D-Day) near / 지연 over */
export function taskTone(task: Task, today: DateKey): Tone {
  if (task.done || !task.dueDate) return 'soft';
  const remaining = diffInDays(today, task.dueDate);
  if (remaining < 0) return 'over';
  return remaining <= 1 ? 'near' : 'soft';
}

/**
 * 하루 부하: 그날 몫(여러 날 작업은 하루 몫 — 서버가 오늘로 옮긴 밀린 작업도 여기 들어간다).
 * 완료한 작업은 세지 않는다(사용자 결정 2026-10-01 — 서버 배치도 완료한 작업은 자리를 차지하지 않는다).
 * includeOverdue면(오늘 화면) 아직 옮기기 전인 밀린 작업 시간도 더한다.
 */
export function selectDayLoad(data: ScheduleData, date: DateKey, { includeOverdue = false } = {}) {
  const planned = data.tasks.filter((t) => !t.done).reduce((a, t) => a + taskHoursOn(t, date), 0);
  const overdue = includeOverdue ? data.tasks.filter((t) => isUnmoved(t, date)).reduce((a, t) => a + hoursOf(t), 0) : 0;
  const hours = round(planned + overdue);
  const capacity = capacityOn(data, date);
  return { hours, capacity, over: hours > capacity };
}

/**
 * 오늘 작업량(오늘 화면 카드): 오늘 몫 전부(완료 포함) + 아직 서버가 옮기기 전인 밀린 작업, 그중 완료한 시간.
 * 작업을 다 끝내도 오늘 얼마나 했는지 남긴다 — 과부하는 총량이 가용을 넘을 때(사용자 결정 2026-10-01).
 */
export function selectTodayWork(data: ScheduleData, today: DateKey) {
  const planned = data.tasks.map((t) => ({ hours: taskHoursOn(t, today), done: t.done }));
  const overdue = data.tasks.filter((t) => isUnmoved(t, today)).map((t) => ({ hours: hoursOf(t), done: false }));
  const all = [...planned, ...overdue];
  const total = round(all.reduce((a, x) => a + x.hours, 0));
  const done = round(all.filter((x) => x.done).reduce((a, x) => a + x.hours, 0));
  const capacity = capacityOn(data, today);
  return { total, done, remaining: round(total - done), capacity, over: total > capacity };
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

export type WeekDay = { date: DateKey; hours: number; capacity: number; over: boolean; tasks: { task: Task; hours: number }[] };

/**
 * 이번 주 날짜별 부하(오늘~일요일): 하루씩 그날 몫 vs 그날 가용 시간(사용자 결정 2026-10-01 — 주간 합계 비교에서 바꿈, 2026-10-17 요일별).
 * 오늘엔 아직 서버가 옮기기 전인 밀린 작업 시간도 더한다(오늘 화면과 같은 기준). 작업은 그날 드는 시간이 큰 순.
 */
export function selectWeekDays(data: ScheduleData, today: DateKey): WeekDay[] {
  return weekDays(today)
    .filter((d) => d >= today)
    .map((date) => {
      const planned = data.tasks.filter((t) => !t.done && coversDate(t, date)).map((task) => ({ task, hours: round(taskHoursOn(task, date)) }));
      const overdue = date === today ? data.tasks.filter((t) => isUnmoved(t, today)).map((task) => ({ task, hours: hoursOf(task) })) : [];
      const tasks = [...overdue, ...planned].sort((a, b) => b.hours - a.hours || a.task.id - b.task.id);
      const { hours, capacity, over } = selectDayLoad(data, date, { includeOverdue: date === today });
      return { date, hours, capacity, over, tasks };
    });
}

/** 프로젝트 일정(간트)에 보여줄 날짜 범위: 오늘 이틀 전부터 9일 */
export function selectGanttRange(today: DateKey): DateKey[] {
  return Array.from({ length: 9 }, (_, i) => addDays(today, i - 2));
}

/** 그날 개인 일정(사용자 결정 2026-10-17 — 오늘 화면·달력에 보여준다), 시작 시각 순 */
export function selectDayEvents(data: ScheduleData, date: DateKey): EventOccurrence[] {
  return (data.events ?? []).filter((e) => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.eventId - b.eventId);
}
