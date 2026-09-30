import { diffInDays, type DateKey } from '@/lib/date';

import type { Draft, DraftTask, State, Task } from './types';

// ⚠ UI 확인용 목업 상태. 서버 데이터는 나중에 TanStack Query(서버 상태)로 옮기고,
//   여기엔 UI 상태만 남긴다(mobile/CLAUDE.md §2-4).

export const initialState: State = { session: null, projects: [], tasks: [], draft: null };

export type Action =
  | { type: 'signIn'; email: string }
  | { type: 'signOut' }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'updateTask'; taskId: string; changes: Partial<Pick<Task, 'title' | 'estimatedHours'>> }
  | { type: 'deleteTask'; taskId: string }
  | { type: 'startDraft'; name: string; description: string }
  | { type: 'setDraftTasks'; tasks: DraftTask[] }
  | { type: 'updateDraftTask'; index: number; changes: Partial<DraftTask> }
  | { type: 'deleteDraftTask'; index: number }
  | { type: 'addDraftTask' }
  | { type: 'confirmDraft' };

let sequence = 0;
function createId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

function updateDraft(state: State, update: (draft: Draft) => Draft): State {
  return state.draft ? { ...state, draft: update(state.draft) } : state;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'signIn':
      return { ...state, session: { email: action.email } };
    case 'signOut':
      // 로그아웃 시 기기에 남은 데이터를 지운다(루트 CLAUDE.md §3-18)
      return initialState;
    case 'toggleTask':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, done: !t.done } : t)),
      };
    case 'updateTask':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, ...action.changes } : t)),
      };
    case 'deleteTask':
      return {
        ...state,
        tasks: state.tasks
          .filter((t) => t.id !== action.taskId)
          .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((id) => id !== action.taskId) })),
      };
    case 'startDraft':
      return { ...state, draft: { name: action.name, description: action.description, tasks: [] } };
    case 'setDraftTasks':
      return updateDraft(state, (d) => ({ ...d, tasks: action.tasks }));
    case 'updateDraftTask':
      return updateDraft(state, (d) => ({
        ...d,
        tasks: d.tasks.map((t, i) => (i === action.index ? { ...t, ...action.changes } : t)),
      }));
    case 'deleteDraftTask':
      return updateDraft(state, (d) => ({ ...d, tasks: d.tasks.filter((_, i) => i !== action.index) }));
    case 'addDraftTask':
      return updateDraft(state, (d) => ({ ...d, tasks: [...d.tasks, { title: '', estimatedHours: null }] }));
    case 'confirmDraft': {
      if (!state.draft) return state;
      const projectId = createId('p');
      const tasks: Task[] = state.draft.tasks.map((t) => ({
        id: createId('t'),
        projectId,
        title: t.title,
        estimatedHours: t.estimatedHours,
        dependsOn: [],
        scheduledDate: null,
        done: false,
      }));
      return {
        ...state,
        projects: [...state.projects, { id: projectId, name: state.draft.name, description: state.draft.description, deadline: null }],
        tasks: [...state.tasks, ...tasks],
        draft: null,
      };
    }
  }
}

function isOverdue(task: Task, today: DateKey): boolean {
  return !task.done && task.scheduledDate !== null && task.scheduledDate < today;
}

export function selectOverdueTasks(state: State, today: DateKey): Task[] {
  return state.tasks
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
}

export function selectTasksOn(state: State, date: DateKey): Task[] {
  return state.tasks.filter((t) => t.scheduledDate === date);
}

export function selectProjectProgress(state: State, projectId: string, today: DateKey) {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  return {
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };
}

export type ScheduleSection = { key: 'overdue' | 'unscheduled' | DateKey; tasks: Task[] };

/** 전체(또는 한 프로젝트) 일정: 밀린 작업 → 오늘 이후 날짜순 → 일정 미배정. 지난 날짜의 완료 작업은 뺀다. */
export function selectScheduleSections(state: State, today: DateKey, projectId?: string): ScheduleSection[] {
  const tasks = projectId ? state.tasks.filter((t) => t.projectId === projectId) : state.tasks;
  const sections: ScheduleSection[] = [];

  const overdue = tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
  if (overdue.length) sections.push({ key: 'overdue', tasks: overdue });

  const upcomingDates = [...new Set(tasks.map((t) => t.scheduledDate).filter((d): d is DateKey => d !== null && diffInDays(today, d) >= 0))].sort();
  for (const date of upcomingDates) {
    sections.push({ key: date, tasks: tasks.filter((t) => t.scheduledDate === date) });
  }

  const unscheduled = tasks.filter((t) => t.scheduledDate === null);
  if (unscheduled.length) sections.push({ key: 'unscheduled', tasks: unscheduled });

  return sections;
}
