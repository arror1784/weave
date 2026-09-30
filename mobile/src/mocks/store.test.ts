import { initialState, reducer, selectOverdueTasks, selectProjectProgress, selectTasksOn, selectScheduleSections } from './store';
import type { State } from './types';

const TODAY = '2026-09-30';

function stateWith(partial: Partial<State>): State {
  return { ...initialState, ...partial };
}

const base = stateWith({
  projects: [
    { id: 'p1', name: '해커톤 준비', description: '', deadline: '2026-10-20' },
    { id: 'p2', name: '스터디', description: '', deadline: null },
  ],
  tasks: [
    { id: 't1', projectId: 'p1', title: '장소 섭외', estimatedHours: 2, dependsOn: [], scheduledDate: '2026-09-25', done: false },
    { id: 't2', projectId: 'p2', title: '3차시 스터디 진행', estimatedHours: 2, dependsOn: [], scheduledDate: TODAY, done: true },
    { id: 't3', projectId: 'p1', title: '후원사 연락', estimatedHours: 1, dependsOn: ['t1'], scheduledDate: TODAY, done: false },
    { id: 't4', projectId: 'p1', title: '예산 정리', estimatedHours: null, dependsOn: [], scheduledDate: null, done: false },
    { id: 't5', projectId: 'p2', title: '지난 발표', estimatedHours: 1, dependsOn: [], scheduledDate: '2026-09-20', done: true },
  ],
});

describe('store reducer', () => {
  it('로그인하면 이메일을 저장하고, 로그아웃하면 모든 데이터를 지운다', () => {
    const signedIn = reducer(base, { type: 'signIn', email: 'me@example.com' });
    expect(signedIn.session).toEqual({ email: 'me@example.com' });

    const signedOut = reducer(signedIn, { type: 'signOut' });
    expect(signedOut.session).toBeNull();
    expect(signedOut.tasks).toEqual([]);
    expect(signedOut.projects).toEqual([]);
  });

  it('작업 완료 여부를 토글한다', () => {
    const next = reducer(base, { type: 'toggleTask', taskId: 't1' });
    expect(next.tasks.find((t) => t.id === 't1')?.done).toBe(true);
  });

  it('작업의 제목과 소요 시간을 수정한다', () => {
    const next = reducer(base, { type: 'updateTask', taskId: 't3', changes: { title: '후원사 메일 발송', estimatedHours: 3 } });
    expect(next.tasks.find((t) => t.id === 't3')).toMatchObject({ title: '후원사 메일 발송', estimatedHours: 3 });
  });

  it('작업을 삭제하면 다른 작업의 선행 작업 목록에서도 빠진다', () => {
    const next = reducer(base, { type: 'deleteTask', taskId: 't1' });
    expect(next.tasks.find((t) => t.id === 't1')).toBeUndefined();
    expect(next.tasks.find((t) => t.id === 't3')?.dependsOn).toEqual([]);
  });

  it('등록 초안을 확정하면 프로젝트와 작업이 추가되고 초안은 비워진다', () => {
    let s = reducer(base, { type: 'startDraft', name: '임베디드 팀프로젝트', description: '4명' });
    s = reducer(s, { type: 'setDraftTasks', tasks: [{ title: '주제 선정', estimatedHours: null }, { title: '부품 구매', estimatedHours: 3 }] });
    s = reducer(s, { type: 'confirmDraft' });

    const project = s.projects.find((p) => p.name === '임베디드 팀프로젝트');
    expect(project).toBeDefined();
    const tasks = s.tasks.filter((t) => t.projectId === project!.id);
    expect(tasks.map((t) => t.title)).toEqual(['주제 선정', '부품 구매']);
    // 일정 생성 알고리즘은 미정 — 새 작업은 일정 미배정으로 들어간다
    expect(tasks.every((t) => t.scheduledDate === null && !t.done)).toBe(true);
    expect(s.draft).toBeNull();
  });

  it('초안의 작업을 수정·삭제·추가한다', () => {
    let s = reducer(base, { type: 'startDraft', name: 'x', description: '' });
    s = reducer(s, { type: 'setDraftTasks', tasks: [{ title: 'a', estimatedHours: null }, { title: 'b', estimatedHours: 1 }] });
    s = reducer(s, { type: 'updateDraftTask', index: 0, changes: { title: 'a2', estimatedHours: 2 } });
    s = reducer(s, { type: 'deleteDraftTask', index: 1 });
    s = reducer(s, { type: 'addDraftTask' });
    expect(s.draft?.tasks).toEqual([{ title: 'a2', estimatedHours: 2 }, { title: '', estimatedHours: null }]);
  });
});

describe('store selectors', () => {
  it('밀린 작업은 예정일이 지났고 완료되지 않은 작업이며, 오래 밀린 순으로 정렬한다', () => {
    expect(selectOverdueTasks(base, TODAY).map((t) => t.id)).toEqual(['t1']);
  });

  it('특정 날짜에 예정된 작업을 돌려준다', () => {
    expect(selectTasksOn(base, TODAY).map((t) => t.id)).toEqual(['t2', 't3']);
  });

  it('프로젝트 진행률과 지연 건수를 계산한다', () => {
    expect(selectProjectProgress(base, 'p1', TODAY)).toEqual({ done: 0, total: 3, overdue: 1 });
    expect(selectProjectProgress(base, 'p2', TODAY)).toEqual({ done: 2, total: 2, overdue: 0 });
  });

  it('전체 일정은 밀린 작업 → 오늘 이후 날짜순 → 일정 미배정 순으로 묶고, 지난 완료 작업은 뺀다', () => {
    const sections = selectScheduleSections(base, TODAY);
    expect(sections.map((s) => s.key)).toEqual(['overdue', '2026-09-30', 'unscheduled']);
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t1']);
    expect(sections[1].tasks.map((t) => t.id)).toEqual(['t2', 't3']);
    expect(sections[2].tasks.map((t) => t.id)).toEqual(['t4']);
  });

  it('프로젝트를 지정하면 그 프로젝트의 작업만 묶는다', () => {
    const sections = selectScheduleSections(base, TODAY, 'p2');
    expect(sections.map((s) => s.key)).toEqual(['2026-09-30']);
  });
});
