import { canMoveTask, draftReducer, type Draft, type DraftTask } from './draft';

const base: Draft = { name: '임베디드', description: '', deadline: '2026-10-09', deliverable: '', progress: '', color: 'teal', attachments: [], chat: [], tasks: [] };

describe('등록 초안', () => {
  it('작업을 고치고, 지우면 그 작업을 선행으로 둔 연결도 끊고, 새 작업을 추가한다', () => {
    let d = draftReducer(base, {
      type: 'setTasks',
      tasks: [
        { key: 'a', title: '개념 학습', description: '', estimatedHours: 2, dependsOnKey: null, prerequisite: true, aiDueDate: null },
        { key: 'b', title: '설계 문서', description: '', estimatedHours: 3, dependsOnKey: 'a', prerequisite: false, aiDueDate: null },
      ],
    });
    d = draftReducer(d, { type: 'updateTask', key: 'b', changes: { estimatedHours: 3.5 } });
    d = draftReducer(d, { type: 'deleteTask', key: 'a' });
    d = draftReducer(d, { type: 'addTask', key: 'c' });
    expect(d!.tasks.map((t) => [t.key, t.title, t.estimatedHours, t.dependsOnKey])).toEqual([
      ['b', '설계 문서', 3.5, null],
      ['c', '새 작업', 1, null],
    ]);
  });

  it('초안이 없으면 작업 변경은 무시하고, reset하면 지운다', () => {
    expect(draftReducer(null, { type: 'addTask', key: 'x' })).toBeNull();
    expect(draftReducer(base, { type: 'reset' })).toBeNull();
  });

  describe('순서 바꾸기 — 선행 작업보다 앞으로는 못 간다 (사용자 결정 2026-10-01: 의존성을 지키는 한해서)', () => {
    const t = (key: string, dependsOnKey: string | null = null): DraftTask => ({ key, title: key, description: '', estimatedHours: 1, dependsOnKey, prerequisite: false, aiDueDate: null });
    // a ← b(선행 a), c는 독립
    const d = draftReducer(base, { type: 'setTasks', tasks: [t('a'), t('b', 'a'), t('c')] })!;
    const keys = (x: Draft | null) => x!.tasks.map((y) => y.key);

    it('이웃과 자리를 바꾼다', () => {
      expect(keys(draftReducer(d, { type: 'moveTask', key: 'c', offset: -1 }))).toEqual(['a', 'c', 'b']);
      expect(keys(draftReducer(d, { type: 'moveTask', key: 'b', offset: 1 }))).toEqual(['a', 'c', 'b']);
    });

    it('선행 작업 위로 올리거나, 선행 작업을 뒤따르는 작업 아래로 내리면 그대로 둔다', () => {
      expect(keys(draftReducer(d, { type: 'moveTask', key: 'b', offset: -1 }))).toEqual(['a', 'b', 'c']);
      expect(keys(draftReducer(d, { type: 'moveTask', key: 'a', offset: 1 }))).toEqual(['a', 'b', 'c']);
      expect(canMoveTask(d.tasks, 'b', -1)).toBe(false);
      expect(canMoveTask(d.tasks, 'a', 1)).toBe(false);
    });

    it('맨 위는 위로, 맨 아래는 아래로 못 간다', () => {
      expect(canMoveTask(d.tasks, 'a', -1)).toBe(false);
      expect(canMoveTask(d.tasks, 'c', 1)).toBe(false);
      expect(canMoveTask(d.tasks, 'c', -1)).toBe(true);
    });
  });
});
