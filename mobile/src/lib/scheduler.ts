import { addDays, diffInDays, type DateKey } from './date';

// ⚠ 임시 일정 생성 알고리즘 — 사용자가 실제 알고리즘을 설계하는 중이라 Claude가 임의로 정한 규칙이다.
//   사용자 확인 후 바뀔 수 있다. 바꾸면 이 주석과 scheduler.test.ts를 함께 고친다.
//   1. 새 프로젝트를 등록할 때 그 작업에만 날짜를 배정한다. 이미 배정된 작업은 옮기지 않고, 쓰는 시간만 뺀다.
//   2. 여러 날 작업은 소요 시간을 기간에 똑같이 나눠 하루 몫으로 센다. 밀린 작업은 전부 오늘 부하로 센다.
//   3. 선행 작업을 먼저, 그 밖엔 AI 제안 순서대로. 기간 = ceil(소요 시간 ÷ 하루 가용 시간)일.
//   4. 시작일 = 오늘(선행 작업이 있으면 그 작업이 끝나는 날)부터, 기간 내내 하루 몫이 남는 가장 이른 날. 주말도 쓴다.
//   5. 작업 마감일 = 프로젝트 마감이 있으면 뒤에서부터(뒤따르는 작업 마감 − 그 작업 기간, 오늘보다 앞서지 않음), 없으면 끝나는 날.
//   6. 끝나는 날이 작업 마감일보다 늦으면 late — 등록 알림에 개수를 알린다.

/** 부하 계산에 필요한 작업 필드 */
export type ScheduledTaskLike = { scheduledDate: DateKey | null; spanDays: number; estimatedHours: number | null; done: boolean };

export type NewTask = { key: string; hours: number; dependsOnKey: string | null };
export type Placement = { key: string; scheduledDate: DateKey; spanDays: number; dueDate: DateKey; late: boolean };

type Input = {
  tasks: NewTask[];
  deadline: DateKey | null;
  today: DateKey;
  /** 하루 가용 시간 */
  capacity: number;
  /** 이미 배정된 작업 — 옮기지 않고, 쓰는 시간만 뺀다 */
  existing: ScheduledTaskLike[];
};

const EPSILON = 1e-9;
/** 1년 안에 자리가 없으면 가장 이른 시작 가능일에 그냥 넣는다 */
const SEARCH_DAYS = 365;

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

export function scheduleNewTasks({ tasks, deadline, today, capacity, existing }: Input): Placement[] {
  const used = new Map<DateKey, number>();
  const add = (date: DateKey, hours: number) => used.set(date, (used.get(date) ?? 0) + hours);
  const free = (date: DateKey) => capacity - (used.get(date) ?? 0);

  // 1. 이미 배정된 작업의 부하 (밀린 작업은 전부 오늘로)
  for (const t of existing) {
    if (t.done || !t.scheduledDate) continue;
    const end = taskEndDate(t)!;
    if (end < today) {
      add(today, t.estimatedHours ?? 0);
      continue;
    }
    for (let i = 0; i < Math.max(1, t.spanDays); i++) {
      const date = addDays(t.scheduledDate, i);
      if (date >= today) add(date, taskHoursOn(t, date));
    }
  }

  const spanOf = (t: NewTask) => Math.max(1, Math.ceil(t.hours / capacity - EPSILON));
  const byKey = new Map(tasks.map((t) => [t.key, t]));

  // 2. 선행 작업 먼저, 그 밖엔 제안 순서대로 배정
  const placed = new Map<string, { start: DateKey; span: number }>();
  const place = (t: NewTask, visiting: Set<string>) => {
    if (placed.has(t.key)) return;
    visiting.add(t.key);
    const before = t.dependsOnKey ? byKey.get(t.dependsOnKey) : undefined;
    if (before && !visiting.has(before.key)) place(before, visiting);
    const dep = before ? placed.get(before.key) : undefined;
    const earliest = dep ? addDays(dep.start, dep.span - 1) : today;
    const span = spanOf(t);
    const perDay = t.hours / span;
    let start = earliest;
    for (let offset = 0; offset < SEARCH_DAYS; offset++) {
      const candidate = addDays(earliest, offset);
      if (Array.from({ length: span }, (_, i) => addDays(candidate, i)).every((d) => free(d) + EPSILON >= perDay)) {
        start = candidate;
        break;
      }
    }
    for (let i = 0; i < span; i++) add(addDays(start, i), perDay);
    placed.set(t.key, { start, span });
  };
  for (const t of tasks) place(t, new Set());

  // 3. 작업 마감일: 마감이 있으면 뒤에서부터(뒤따르는 작업의 마감 − 그 작업 기간), 없으면 끝나는 날
  const due = new Map<string, DateKey>();
  const dueOf = (t: NewTask, visiting: Set<string>): DateKey => {
    const known = due.get(t.key);
    if (known) return known;
    const { start, span } = placed.get(t.key)!;
    let result: DateKey;
    if (!deadline) {
      result = addDays(start, span - 1);
    } else {
      visiting.add(t.key);
      result = deadline;
      for (const next of tasks.filter((x) => x.dependsOnKey === t.key && !visiting.has(x.key))) {
        const latest = addDays(dueOf(next, visiting), -spanOf(next));
        if (latest < result) result = latest;
      }
      if (result < today) result = today;
    }
    due.set(t.key, result);
    return result;
  };

  return tasks.map((t) => {
    const { start, span } = placed.get(t.key)!;
    const dueDate = dueOf(t, new Set());
    return { key: t.key, scheduledDate: start, spanDays: span, dueDate, late: addDays(start, span - 1) > dueDate };
  });
}
