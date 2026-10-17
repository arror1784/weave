import type { Project, Task } from '@/api/types';

import { capacityOn, isOverdue, selectDayEvents, selectDayItems, selectDayLoad, selectGanttRange, selectOverdueTasks, selectTodayTasks, selectTodayWork, selectWeekDays, taskTone, type ScheduleData } from './schedule';

const T = '2026-09-30'; // 수요일

const project = (p: Partial<Project> & { id: number }): Project => ({ name: `p${p.id}`, description: '', deadline: null, status: 'active', color: 'teal', ...p });
const task = (t: Partial<Task> & { id: number }): Task => ({
  projectId: 1,
  title: `t${t.id}`,
  estimatedHours: 1,
  dependsOnId: null,
  scheduledDate: T,
  spanDays: 1,
  days: [],
  dueDate: null,
  done: false,
  prerequisite: false,
  delayedFrom: null,
  description: '',
  ...t,
});

const data: ScheduleData = {
  dailyAvailableHours: 5,
  projects: [project({ id: 1, deadline: '2026-10-09' }), project({ id: 2, deadline: '2026-10-03', color: 'magenta' }), project({ id: 3, color: 'violet' })],
  tasks: [
    task({ id: 1, projectId: 2, title: 'late', scheduledDate: '2026-09-28', dueDate: '2026-09-28' }),
    task({ id: 2, projectId: 3, title: 'pre', scheduledDate: null }),
    task({ id: 3, projectId: 3, title: 'today1', dueDate: '2026-10-01', estimatedHours: 0.75, dependsOnId: 2 }),
    task({ id: 4, title: 'today2', dueDate: '2026-10-02', estimatedHours: 2 }),
    task({ id: 5, title: 'doneToday', dueDate: '2026-10-05', estimatedHours: 1.5, done: true }),
    task({ id: 6, title: 'fri', scheduledDate: '2026-10-02', estimatedHours: 4 }),
    task({ id: 7, title: 'nextWeek', scheduledDate: '2026-10-06', estimatedHours: 3 }),
    // 9/29~10/1 사흘에 걸친 3시간 작업 → 하루 1시간씩
    task({ id: 8, title: 'multi', scheduledDate: '2026-09-29', spanDays: 3, estimatedHours: 3 }),
  ],
};
const titles = (ts: Task[]) => ts.map((t) => t.title);

describe('밀린 작업 (서버가 오늘로 옮긴 추가 작업)', () => {
  const rolled = task({ id: 20, title: 'rolled', scheduledDate: T, delayedFrom: '2026-09-28', estimatedHours: 2 });
  const withRolled: ScheduleData = { ...data, tasks: [...data.tasks, rolled] };

  it('오늘로 옮겨졌어도 지연으로 보고, 오늘 할 일 맨 앞(지연 묶음)에 둔다', () => {
    expect(isOverdue(rolled, T)).toBe(true);
    expect(titles(selectTodayTasks(withRolled, T)).slice(0, 2)).toEqual(['late', 'rolled']);
  });

  it('부하에는 한 번만 센다 (오늘 몫으로)', () => {
    // 기존 4.75 + rolled 2
    expect(selectDayLoad(withRolled, T, { includeOverdue: true }).hours).toBe(6.75);
    expect(selectWeekDays(withRolled, T)[0].hours).toBe(6.75);
  });
});

describe('일정 계산', () => {
  it('오늘 할 일: 오늘이 기간에 들어가는 작업 + 밀린 작업, 지연 먼저·그다음 마감 가까운 순 — 완료 여부로는 순서를 바꾸지 않는다', () => {
    // doneToday(마감 10/5)는 완료했어도 마감 순서 자리에 그대로 있다
    expect(titles(selectTodayTasks(data, T))).toEqual(['late', 'today1', 'today2', 'doneToday', 'multi']);
  });

  it('작업을 체크(완료)하거나 해제해도 오늘 할 일 순서가 바뀌지 않는다 (사용자 결정 2026-10-01)', () => {
    // 서버는 밀린 작업을 오늘로 옮겨(delayedFrom) 보낸다 — 그 상태 그대로
    const rolled: ScheduleData = { ...data, tasks: data.tasks.map((t) => (t.id === 1 ? { ...t, scheduledDate: T, delayedFrom: '2026-09-28' } : t)) };
    const before = titles(selectTodayTasks(rolled, T));
    const toggled = (id: number): ScheduleData => ({ ...rolled, tasks: rolled.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
    for (const id of [1, 3, 4, 5, 8]) expect(titles(selectTodayTasks(toggled(id), T))).toEqual(before);
  });

  it('지난 날짜에 제때 끝낸 작업은 오늘 할 일에 나오지 않는다', () => {
    const past: ScheduleData = { ...data, tasks: [task({ id: 30, title: 'pastDone', scheduledDate: '2026-09-28', done: true })] };
    expect(selectTodayTasks(past, T)).toEqual([]);
  });

  it('밀린 작업은 끝나는 날이 지났고 완료되지 않은 작업이다 (여러 날 작업은 끝나는 날 기준)', () => {
    expect(titles(selectOverdueTasks(data, T))).toEqual(['late']);
    expect(isOverdue(data.tasks[7], T)).toBe(false);
  });

  it('D-day 톤: 지난 마감은 over, 오늘·내일은 near, 그 외 soft, 완료는 soft', () => {
    expect(taskTone(task({ id: 9, dueDate: '2026-09-29' }), T)).toBe('over');
    expect(taskTone(task({ id: 9, dueDate: T }), T)).toBe('near');
    expect(taskTone(task({ id: 9, dueDate: '2026-10-01' }), T)).toBe('near');
    expect(taskTone(task({ id: 9, dueDate: '2026-10-02' }), T)).toBe('soft');
    expect(taskTone(task({ id: 9, dueDate: '2026-09-29', done: true }), T)).toBe('soft');
  });

  it('오늘 부하: 오늘 몫(여러 날 작업은 하루 몫) + 밀린 작업 전부를 하루 가용 시간과 비교한다 — 완료한 작업은 빼고', () => {
    // late 1 + today1 0.75 + today2 2 + multi 1 = 4.75 (doneToday 1.5는 완료라 뺀다 — 사용자 결정 2026-10-01)
    expect(selectDayLoad(data, T, { includeOverdue: true })).toEqual({ hours: 4.75, capacity: 5, over: false });
  });

  it('달력의 날짜 부하: 그날 몫만 센다 (밀린 작업·완료한 작업 제외)', () => {
    expect(selectDayLoad(data, T)).toEqual({ hours: 3.75, capacity: 5, over: false });
    expect(selectDayLoad(data, '2026-10-01')).toEqual({ hours: 1, capacity: 5, over: false });
    expect(selectDayLoad(data, '2026-10-02')).toEqual({ hours: 4, capacity: 5, over: false });
  });

  it('날짜별 항목: 그날이 기간에 들어가는 작업(하루 몫 시간) + 그날 마감인 프로젝트', () => {
    expect(selectDayItems(data, '2026-10-03')).toEqual([{ kind: 'due', projectId: 2, title: 'p2 마감', hours: 0, due: true }]);
    expect(selectDayItems(data, T).map((i) => [i.title, i.hours])).toEqual([
      ['today1', 0.75],
      ['today2', 2],
      ['doneToday', 1.5],
      ['multi', 1],
    ]);
  });

  it('이번 주 날짜별 부하: 오늘~일요일 하루씩 그날 몫 vs 하루 가용 시간, 오늘엔 아직 안 옮긴 밀린 작업도 더한다', () => {
    const days = selectWeekDays({ ...data, dailyAvailableHours: 3 }, T);
    expect(days.map((d) => d.date)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    // 오늘: late 1 + today1 0.75 + today2 2 + multi 1 = 4.75 (완료한 doneToday는 빼고)
    expect(days.map((d) => d.hours)).toEqual([4.75, 1, 4, 0, 0]);
    expect(days.map((d) => d.over)).toEqual([true, false, true, false, false]);
    expect(days[0].capacity).toBe(3);
  });

  it('요일별·공휴일 가용 시간(사용자 결정 2026-10-17): 날짜마다 그날 가용과 비교 — 공휴일은 요일보다 우선, 0시간이면 쉬는 날', () => {
    // 월3 화3 수1 목0 금3 토5 일5, 공휴일 2 — 10/3(토)은 공휴일
    const weekly = { ...data, weeklyAvailableHours: [3, 3, 1, 0, 3, 5, 5], holidayAvailableHours: 2, holidays: ['2026-10-03'] };
    expect(['2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04'].map((d) => capacityOn(weekly, d))).toEqual([1, 0, 2, 5]);
    const days = selectWeekDays(weekly, T);
    expect(days.map((d) => d.capacity)).toEqual([1, 0, 3, 2, 5]);
    expect(days.map((d) => d.over)).toEqual([true, true, true, false, false]); // 4.75>1 · 1>0 · 4>3
    expect(selectTodayWork(weekly, T).capacity).toBe(1);
  });

  it('개인 일정(사용자 결정 2026-10-17): 서버가 날짜별로 계산한 가용 시간(요일·공휴일 − 개인 일정)이 있으면 그 값을 쓴다', () => {
    const withEvents = { ...data, weeklyAvailableHours: [3, 3, 3, 3, 3, 3, 3], holidayAvailableHours: 3, holidays: [], availableHoursByDate: { [T]: 1 } };
    expect(capacityOn(withEvents, T)).toBe(1);
    expect(capacityOn(withEvents, '2026-10-01')).toBe(3); // 범위 밖이면 요일 값
    expect(selectTodayWork(withEvents, T).capacity).toBe(1);
  });

  it('그날 개인 일정: 시작 시각 순', () => {
    const withEvents = {
      ...data,
      events: [
        { eventId: 2, date: T, title: '동아리', startTime: '18:00', endTime: '21:00' },
        { eventId: 1, date: T, title: '수업', startTime: '10:00', endTime: '12:00' },
        { eventId: 1, date: '2026-10-01', title: '수업', startTime: '10:00', endTime: '12:00' },
      ],
    };
    expect(selectDayEvents(withEvents, T).map((e) => e.title)).toEqual(['수업', '동아리']);
    expect(selectDayEvents(data, T)).toEqual([]);
  });

  it('요일별 값이 없는 옛 응답이면 하루 가용 시간을 쓴다', () => {
    expect(capacityOn(data, T)).toBe(5);
  });

  it('날짜별 작업은 그날 드는 시간이 큰 순, 시간은 그날 몫', () => {
    const [today, tomorrow] = selectWeekDays(data, T);
    expect(today.tasks.map((x) => [x.task.title, x.hours])).toEqual([['today2', 2], ['late', 1], ['multi', 1], ['today1', 0.75]]);
    expect(tomorrow.tasks.map((x) => [x.task.title, x.hours])).toEqual([['multi', 1]]);
  });

  it('서버가 날짜별로 나눈 시간(days)대로 센다', () => {
    const front: ScheduleData = { ...data, tasks: [task({ id: 40, title: 'front', estimatedHours: 4, spanDays: 2, days: [{ date: T, hours: 3 }, { date: '2026-10-01', hours: 1 }] })] };
    expect(selectWeekDays(front, T).slice(0, 2).map((d) => d.hours)).toEqual([3, 1]);
  });

  it('날짜별 배정 사이의 빈 날에는 그 작업이 보이지 않는다', () => {
    const gap = task({ id: 41, title: 'gap', estimatedHours: 4, spanDays: 3, days: [{ date: T, hours: 3 }, { date: '2026-10-02', hours: 1 }] });
    const d: ScheduleData = { ...data, tasks: [gap] };
    expect(selectDayItems(d, '2026-10-01')).toEqual([]);
    expect(selectWeekDays(d, T)[1].tasks).toEqual([]);
    expect(selectDayItems(d, '2026-10-02')[0].hours).toBe(1);
  });

  it('오늘 작업량: 오늘 몫 전부(완료 포함) + 아직 안 옮긴 밀린 작업, 그중 완료한 시간 — 총량이 가용을 넘으면 과부하 (사용자 결정 2026-10-01)', () => {
    // late 1 + today1 0.75 + today2 2 + doneToday 1.5(완료) + multi 1 = 6.25
    expect(selectTodayWork(data, T)).toEqual({ total: 6.25, done: 1.5, remaining: 4.75, capacity: 5, over: true });
  });

  it('오늘 작업을 다 끝내도 작업량은 그대로 남는다', () => {
    const allDone: ScheduleData = { ...data, tasks: data.tasks.filter((t) => t.title !== 'late').map((t) => ({ ...t, done: true })) };
    expect(selectTodayWork(allDone, T)).toEqual({ total: 5.25, done: 5.25, remaining: 0, capacity: 5, over: true });
  });

  it('프로젝트 일정(간트) 범위: 오늘 이틀 전부터 9일', () => {
    const range = selectGanttRange(T);
    expect(range[0]).toBe('2026-09-28');
    expect(range).toHaveLength(9);
  });
});
