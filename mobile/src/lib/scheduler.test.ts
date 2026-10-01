import { taskEndDate, taskHoursOn, type ScheduledTaskLike } from './scheduler';

// 일정 배정 자체는 서버(backend SchedulerTest)가 검사한다. 여기서는 앱이 쓰는 부하 계산만.
const task = (t: Partial<ScheduledTaskLike>): ScheduledTaskLike => ({ scheduledDate: '2026-09-29', spanDays: 3, estimatedHours: 3, done: false, ...t });

describe('부하 계산', () => {
  it('끝나는 날은 시작일 + 기간 − 1, 날짜가 없으면 null', () => {
    expect(taskEndDate(task({}))).toBe('2026-10-01');
    expect(taskEndDate(task({ scheduledDate: null }))).toBeNull();
  });

  it('여러 날 작업은 기간 안의 날에만 소요 시간 ÷ 기간', () => {
    expect(taskHoursOn(task({}), '2026-09-30')).toBe(1);
    expect(taskHoursOn(task({}), '2026-10-02')).toBe(0);
    expect(taskHoursOn(task({ scheduledDate: null }), '2026-09-30')).toBe(0);
  });
});
