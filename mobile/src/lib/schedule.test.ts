import type { Project, Task } from '@/api/types';

import { isOverdue, selectDayItems, selectDayLoad, selectGanttRange, selectOverdueTasks, selectTodayTasks, selectWeekLoad, taskTone, type ScheduleData } from './schedule';

const T = '2026-09-30'; // 수요일

const project = (p: Partial<Project> & { id: number }): Project => ({ name: `p${p.id}`, description: '', deadline: null, status: 'active', color: 'teal', ...p });
const task = (t: Partial<Task> & { id: number }): Task => ({
  projectId: 1,
  title: `t${t.id}`,
  estimatedHours: 1,
  dependsOnId: null,
  scheduledDate: T,
  spanDays: 1,
  dueDate: null,
  done: false,
  prerequisite: false,
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

describe('일정 계산', () => {
  it('오늘 할 일: 오늘이 기간에 들어가는 작업 + 밀린 작업, 지연 먼저·그다음 마감 가까운 순, 완료는 맨 뒤', () => {
    expect(titles(selectTodayTasks(data, T))).toEqual(['late', 'today1', 'today2', 'multi', 'doneToday']);
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

  it('오늘 부하: 오늘 몫(여러 날 작업은 하루 몫) + 밀린 작업 전부를 하루 가용 시간과 비교한다', () => {
    // late 1 + today1 0.75 + today2 2 + doneToday 1.5 + multi 1 = 6.25
    expect(selectDayLoad(data, T, { includeOverdue: true })).toEqual({ hours: 6.25, capacity: 5, over: true });
  });

  it('달력의 날짜 부하: 그날 몫만 센다 (밀린 작업 제외)', () => {
    expect(selectDayLoad(data, T)).toEqual({ hours: 5.25, capacity: 5, over: true });
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

  it('이번 주 부하: 오늘~일요일 남은 작업 몫 + 밀린 작업 vs 하루 가용 시간 × 남은 날 수, 작업은 시간 큰 순', () => {
    const load = selectWeekLoad(data, T);
    // late 1 + today1 0.75 + today2 2 + fri 4 + multi 2(9/30·10/1) = 9.75
    expect(load.estimated).toBe(9.75);
    expect(load.available).toBe(25);
    expect(titles(load.tasks)).toEqual(['fri', 'multi', 'today2', 'late', 'today1']);
  });

  it('프로젝트 일정(간트) 범위: 오늘 이틀 전부터 9일', () => {
    const range = selectGanttRange(T);
    expect(range[0]).toBe('2026-09-28');
    expect(range).toHaveLength(9);
  });
});
