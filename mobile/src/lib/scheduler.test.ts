import { scheduleNewTasks, type ScheduledTaskLike } from './scheduler';

// ⚠ 임시 알고리즘(규칙은 scheduler.ts 머리 주석) — 사용자 확인 후 바뀔 수 있다.
const T = '2026-09-30';
const embedded = [
  { key: 'k1', hours: 2, dependsOnKey: null },
  { key: 'k2', hours: 3, dependsOnKey: 'k1' },
  { key: 'k3', hours: 4, dependsOnKey: 'k2' },
  { key: 'k4', hours: 2, dependsOnKey: null },
];
const existing = (t: Partial<ScheduledTaskLike>): ScheduledTaskLike => ({ scheduledDate: T, spanDays: 1, estimatedHours: 1, done: false, ...t });

describe('scheduleNewTasks (임시 일정 생성 알고리즘)', () => {
  it('문서 예시: 하루 3시간 안에서 가장 이른 날에 배정하고, 작업 마감일은 프로젝트 마감에서 거꾸로 계산한다', () => {
    const result = scheduleNewTasks({ tasks: embedded, deadline: '2026-10-09', today: T, capacity: 3, existing: [] });
    expect(result).toEqual([
      { key: 'k1', scheduledDate: '2026-09-30', spanDays: 1, dueDate: '2026-10-06', late: false },
      { key: 'k2', scheduledDate: '2026-10-01', spanDays: 1, dueDate: '2026-10-07', late: false },
      { key: 'k3', scheduledDate: '2026-10-02', spanDays: 2, dueDate: '2026-10-09', late: false },
      { key: 'k4', scheduledDate: '2026-10-04', spanDays: 1, dueDate: '2026-10-09', late: false },
    ]);
  });

  it('이미 배정된 작업이 쓴 시간을 빼고 남은 시간에만 넣는다 (여러 날 작업은 하루 몫으로 나눠 센다)', () => {
    // 오늘·내일 하루 2시간씩 차 있음 → 남은 1시간엔 2시간 작업이 못 들어간다
    const busy = [existing({ estimatedHours: 4, spanDays: 2 })];
    const [placed] = scheduleNewTasks({ tasks: [{ key: 'a', hours: 2, dependsOnKey: null }], deadline: null, today: T, capacity: 3, existing: busy });
    expect(placed.scheduledDate).toBe('2026-10-02');
  });

  it('밀린 작업은 남은 시간 전부를 오늘 부하로 센다', () => {
    const overdue = [existing({ scheduledDate: '2026-09-27', estimatedHours: 2 })];
    const [placed] = scheduleNewTasks({ tasks: [{ key: 'a', hours: 2, dependsOnKey: null }], deadline: null, today: T, capacity: 3, existing: overdue });
    expect(placed.scheduledDate).toBe('2026-10-01');
  });

  it('완료한 작업과 날짜가 없는 작업은 부하로 세지 않는다', () => {
    const done = [existing({ estimatedHours: 3, done: true }), existing({ estimatedHours: 3, scheduledDate: null })];
    const [placed] = scheduleNewTasks({ tasks: [{ key: 'a', hours: 3, dependsOnKey: null }], deadline: null, today: T, capacity: 3, existing: done });
    expect(placed.scheduledDate).toBe(T);
  });

  it('선행 작업이 뒤에 적혀 있어도 선행 작업이 끝나는 날 이후에 배정한다', () => {
    const result = scheduleNewTasks({
      tasks: [
        { key: 'after', hours: 1, dependsOnKey: 'before' },
        { key: 'before', hours: 6, dependsOnKey: null },
      ],
      deadline: null,
      today: T,
      capacity: 3,
      existing: [],
    });
    expect(result.map((r) => [r.key, r.scheduledDate, r.spanDays])).toEqual([
      ['after', '2026-10-02', 1],
      ['before', '2026-09-30', 2],
    ]);
  });

  it('마감이 없으면 작업 마감일은 작업이 끝나는 날이다', () => {
    const [placed] = scheduleNewTasks({ tasks: [{ key: 'a', hours: 5, dependsOnKey: null }], deadline: null, today: T, capacity: 3, existing: [] });
    expect(placed).toMatchObject({ scheduledDate: T, spanDays: 2, dueDate: '2026-10-01', late: false });
  });

  it('마감 안에 못 끝나면 late로 표시하고, 작업 마감일은 오늘보다 앞서지 않는다', () => {
    const result = scheduleNewTasks({
      tasks: [
        { key: 'a', hours: 3, dependsOnKey: null },
        { key: 'b', hours: 3, dependsOnKey: 'a' },
      ],
      deadline: T,
      today: T,
      capacity: 3,
      existing: [],
    });
    expect(result).toEqual([
      { key: 'a', scheduledDate: T, spanDays: 1, dueDate: T, late: false },
      { key: 'b', scheduledDate: '2026-10-01', spanDays: 1, dueDate: T, late: true },
    ]);
  });
});
