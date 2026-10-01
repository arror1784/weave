import { draftReducer, type Draft } from './draft';

const base: Draft = { name: '임베디드', description: '', deadline: '2026-10-09', color: 'teal', attachments: [], chat: [], tasks: [] };

describe('등록 초안', () => {
  it('작업을 고치고, 지우면 그 작업을 선행으로 둔 연결도 끊고, 새 작업을 추가한다', () => {
    let d = draftReducer(base, {
      type: 'setTasks',
      tasks: [
        { key: 'a', title: '개념 학습', estimatedHours: 2, dependsOnKey: null, prerequisite: true },
        { key: 'b', title: '설계 문서', estimatedHours: 3, dependsOnKey: 'a', prerequisite: false },
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
});
