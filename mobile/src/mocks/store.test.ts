import {
  dailyCapacity,
  initialState,
  reducer,
  selectDayItems,
  selectDayLoad,
  selectGanttRange,
  selectOverdueTasks,
  selectProjectSummary,
  selectProjects,
  selectTodayTasks,
  selectWeekLoad,
  taskTone,
} from './store';
import type { Project, State, Task } from './types';

const T = '2026-09-30'; // 수요일

const project = (p: Partial<Project> & { id: string }): Project => ({ name: p.id, short: p.id, description: '', deadline: null, status: 'active', color: 'teal', ...p });
const task = (t: Partial<Task> & { id: string }): Task => ({
  projectId: 'p1',
  title: t.id,
  estimatedHours: 1,
  dependsOn: null,
  scheduledDate: T,
  spanDays: 1,
  dueDate: null,
  done: false,
  prerequisite: false,
  ...t,
});

function stateWith(partial: Partial<State>): State {
  return { ...initialState, ...partial };
}

const base = stateWith({
  settings: { weeklyAvailableHours: 25 },
  projects: [project({ id: 'p1', deadline: '2026-10-09' }), project({ id: 'p2', deadline: '2026-10-03', color: 'magenta' }), project({ id: 'p3', deadline: null, color: 'violet' })],
  tasks: [
    task({ id: 'late', projectId: 'p2', scheduledDate: '2026-09-28', dueDate: '2026-09-28', estimatedHours: 1 }),
    task({ id: 'pre', projectId: 'p3', scheduledDate: null }),
    task({ id: 'today1', projectId: 'p3', dueDate: '2026-10-01', estimatedHours: 0.75, dependsOn: 'pre' }),
    task({ id: 'today2', dueDate: '2026-10-02', estimatedHours: 2 }),
    task({ id: 'doneToday', dueDate: '2026-10-05', estimatedHours: 1.5, done: true }),
    task({ id: 'fri', scheduledDate: '2026-10-02', estimatedHours: 4 }),
    task({ id: 'nextWeek', scheduledDate: '2026-10-06', estimatedHours: 3 }),
    task({ id: 'oldDone', scheduledDate: '2026-09-20', done: true }),
  ],
  events: [{ id: 'ev', projectId: 'p2', title: '정기 회의', date: T, time: '19:00', hours: 1.5 }],
});

describe('reducer', () => {
  it('로그인하면 이메일을 저장하고, 로그아웃하면 모든 데이터를 지운다', () => {
    const signedIn = reducer(base, { type: 'signIn', email: 'me@example.com' });
    expect(signedIn.session).toEqual({ email: 'me@example.com' });
    const signedOut = reducer(signedIn, { type: 'signOut' });
    expect(signedOut.session).toBeNull();
    expect(signedOut.tasks).toEqual([]);
  });

  it('작업 완료 여부를 토글한다', () => {
    expect(reducer(base, { type: 'toggleTask', taskId: 'today2' }).tasks.find((t) => t.id === 'today2')?.done).toBe(true);
  });

  it('작업의 제목·소요 시간·선행 작업을 수정한다', () => {
    const next = reducer(base, { type: 'updateTask', taskId: 'today2', changes: { title: '새 이름', estimatedHours: 3, dependsOn: 'fri' } });
    expect(next.tasks.find((t) => t.id === 'today2')).toMatchObject({ title: '새 이름', estimatedHours: 3, dependsOn: 'fri' });
  });

  it('작업을 삭제하면 그 작업을 선행으로 둔 작업의 연결도 끊긴다', () => {
    const next = reducer(base, { type: 'deleteTask', taskId: 'pre' });
    expect(next.tasks.find((t) => t.id === 'pre')).toBeUndefined();
    expect(next.tasks.find((t) => t.id === 'today1')?.dependsOn).toBeNull();
  });

  it('프로젝트에 작업을 추가한다', () => {
    const next = reducer(base, { type: 'addTask', task: task({ id: 'new', projectId: 'p1', title: '새 작업', scheduledDate: null }) });
    expect(next.tasks.at(-1)).toMatchObject({ id: 'new', title: '새 작업' });
  });

  it('작업들을 다음 주로 미룬다 (예정일 +7일)', () => {
    const next = reducer(base, { type: 'deferTasks', taskIds: ['fri', 'today2'] });
    expect(next.tasks.find((t) => t.id === 'fri')?.scheduledDate).toBe('2026-10-09');
    expect(next.tasks.find((t) => t.id === 'today2')?.scheduledDate).toBe('2026-10-07');
  });

  it('주간 가용 시간을 바꾼다', () => {
    expect(reducer(base, { type: 'setWeeklyHours', hours: 30 }).settings.weeklyAvailableHours).toBe(30);
  });

  it('등록 초안: 수정·삭제·추가 후 확정하면 프로젝트와 작업(선행 연결 포함)이 생긴다', () => {
    let s = reducer(base, { type: 'startDraft', name: '임베디드', description: '설명', deadline: '2026-10-09' });
    s = reducer(s, {
      type: 'setDraftTasks',
      tasks: [
        { key: 'a', title: '개념 학습', estimatedHours: 2, dependsOnKey: null, prerequisite: true },
        { key: 'b', title: '설계 문서', estimatedHours: 3, dependsOnKey: 'a', prerequisite: false },
        { key: 'c', title: '지울 작업', estimatedHours: 1, dependsOnKey: null, prerequisite: false },
      ],
    });
    s = reducer(s, { type: 'updateDraftTask', key: 'b', changes: { estimatedHours: 3.5 } });
    s = reducer(s, { type: 'deleteDraftTask', key: 'c' });
    s = reducer(s, { type: 'addDraftTask', key: 'd' });
    s = reducer(s, { type: 'confirmDraft', projectId: 'p-new' });

    const created = s.projects.find((p) => p.id === 'p-new');
    expect(created).toMatchObject({ name: '임베디드', deadline: '2026-10-09', status: 'active' });
    const tasks = s.tasks.filter((t) => t.projectId === 'p-new');
    expect(tasks.map((t) => [t.title, t.estimatedHours, t.prerequisite])).toEqual([
      ['개념 학습', 2, true],
      ['설계 문서', 3.5, false],
      ['새 작업', 1, false],
    ]);
    expect(tasks[1].dependsOn).toBe(tasks[0].id);
    expect(tasks.every((t) => t.scheduledDate === null)).toBe(true);
    expect(s.draft).toBeNull();
  });

  it('새 프로젝트는 아직 쓰지 않은 프로젝트 색을 먼저 받는다', () => {
    let s = reducer(base, { type: 'startDraft', name: 'x', description: '', deadline: null });
    s = reducer(s, { type: 'confirmDraft', projectId: 'p-new' });
    expect(s.projects.find((p) => p.id === 'p-new')?.color).toBe('gray');
  });
});

describe('selectors', () => {
  it('오늘 할 일: 오늘 예정 작업 + 밀린 작업, 지연 먼저·그다음 마감 가까운 순, 완료는 맨 뒤', () => {
    expect(selectTodayTasks(base, T).map((t) => t.id)).toEqual(['late', 'today1', 'today2', 'doneToday']);
  });

  it('밀린 작업은 예정일이 지났고 완료되지 않은 작업이다', () => {
    expect(selectOverdueTasks(base, T).map((t) => t.id)).toEqual(['late']);
  });

  it('D-day 톤: 지난 마감은 over, 오늘·내일은 near, 그 외 soft, 완료는 soft', () => {
    expect(taskTone(task({ id: 'x', dueDate: '2026-09-29' }), T)).toBe('over');
    expect(taskTone(task({ id: 'x', dueDate: T }), T)).toBe('near');
    expect(taskTone(task({ id: 'x', dueDate: '2026-10-01' }), T)).toBe('near');
    expect(taskTone(task({ id: 'x', dueDate: '2026-10-02' }), T)).toBe('soft');
    expect(taskTone(task({ id: 'x', dueDate: '2026-09-29', done: true }), T)).toBe('soft');
  });

  it('하루 가용 시간은 주간 가용 시간 ÷ 5 (주 5일 기준)', () => {
    expect(dailyCapacity(base.settings)).toBe(5);
  });

  it('오늘 부하: 오늘 할 일(밀린 작업 포함) + 고정 일정 시간을 하루 가용 시간과 비교한다', () => {
    // late 1 + today1 0.75 + today2 2 + doneToday 1.5 + 정기 회의 1.5 = 6.75
    expect(selectDayLoad(base, T, { includeOverdue: true })).toEqual({ hours: 6.75, capacity: 5, over: true });
  });

  it('달력의 날짜 부하: 그날 예정된 작업 + 고정 일정만 센다 (밀린 작업 제외)', () => {
    expect(selectDayLoad(base, T)).toEqual({ hours: 5.75, capacity: 5, over: true });
    expect(selectDayLoad(base, '2026-10-02')).toEqual({ hours: 4, capacity: 5, over: false });
  });

  it('날짜별 항목: 그날 작업 + 고정 일정 + 그날 마감인 프로젝트', () => {
    const items = selectDayItems(base, '2026-10-03');
    expect(items).toEqual([{ kind: 'due', projectId: 'p2', title: 'p2 마감', hours: 0, due: true }]);
    expect(selectDayItems(base, T).map((i) => i.title)).toEqual(['today1', 'today2', 'doneToday', '정기 회의']);
  });

  it('이번 주 부하: 이번 주(월~일) 남은 작업 + 밀린 작업 시간 합과 주간 가용 시간, 미룰 후보(시간 큰 순)', () => {
    const load = selectWeekLoad(base, T);
    // late 1 + today1 0.75 + today2 2 + fri 4 (완료·다음 주·미배정 제외)
    expect(load.estimated).toBe(7.75);
    expect(load.available).toBe(25);
    expect(load.candidates.map((t) => t.id)).toEqual(['fri', 'today2', 'late', 'today1']);
  });

  it('프로젝트 목록: 상태로 거르고 마감 가까운 순, 상시는 맨 뒤', () => {
    expect(selectProjects(base, 'active').map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
    expect(selectProjects(base, 'done')).toEqual([]);
  });

  it('프로젝트 요약: 진행률과 안내 문구 (지연이 있으면 지연, 아니면 다음 작업)', () => {
    expect(selectProjectSummary(base, 'p2', T)).toMatchObject({ done: 0, total: 1, percent: 0, note: '지연 1건 · late', late: true });
    expect(selectProjectSummary(base, 'p1', T)).toMatchObject({ done: 2, total: 5, percent: 40, note: '다음: today2', late: false });
  });

  it('프로젝트 일정(간트) 범위: 오늘 이틀 전부터 9일', () => {
    const range = selectGanttRange(T);
    expect(range[0]).toBe('2026-09-28');
    expect(range).toHaveLength(9);
  });
});
