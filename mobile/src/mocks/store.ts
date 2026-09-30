import { addDays, diffInDays, weekDays, type DateKey } from '@/lib/date';
import { projectColorOrder } from '@/theme/colors';

import type { DraftTask, Project, Settings, State, Task } from './types';

// ⚠ UI 확인용 목업 상태. 서버 데이터는 나중에 TanStack Query(서버 상태)로 옮기고,
//   여기엔 UI 상태만 남긴다(mobile/CLAUDE.md §2-4).

export const initialState: State = {
  session: null,
  projects: [],
  tasks: [],
  events: [],
  draft: null,
  settings: { weeklyAvailableHours: 25 },
};

export type Action =
  | { type: 'signIn'; email: string }
  | { type: 'signOut' }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'updateTask'; taskId: string; changes: Partial<Pick<Task, 'title' | 'estimatedHours' | 'dependsOn'>> }
  | { type: 'deleteTask'; taskId: string }
  | { type: 'addTask'; task: Task }
  | { type: 'deferTasks'; taskIds: string[] }
  | { type: 'setWeeklyHours'; hours: number }
  | { type: 'startDraft'; name: string; description: string; deadline: DateKey | null }
  | { type: 'setDraftTasks'; tasks: DraftTask[] }
  | { type: 'updateDraftTask'; key: string; changes: Partial<Omit<DraftTask, 'key'>> }
  | { type: 'deleteDraftTask'; key: string }
  | { type: 'addDraftTask'; key: string }
  | { type: 'confirmDraft'; projectId: string };

let sequence = 0;
export function createId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'signIn':
      return { ...state, session: { email: action.email } };
    case 'signOut':
      // 로그아웃 시 기기에 남은 데이터를 지운다(루트 CLAUDE.md §3-18)
      return initialState;
    case 'toggleTask':
      return mapTasks(state, (t) => (t.id === action.taskId ? { ...t, done: !t.done } : t));
    case 'updateTask':
      return mapTasks(state, (t) => (t.id === action.taskId ? { ...t, ...action.changes } : t));
    case 'deleteTask':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.taskId).map((t) => (t.dependsOn === action.taskId ? { ...t, dependsOn: null } : t)),
      };
    case 'addTask':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'deferTasks':
      return mapTasks(state, (t) => (action.taskIds.includes(t.id) && t.scheduledDate ? { ...t, scheduledDate: addDays(t.scheduledDate, 7) } : t));
    case 'setWeeklyHours':
      return { ...state, settings: { ...state.settings, weeklyAvailableHours: action.hours } };
    case 'startDraft':
      return { ...state, draft: { name: action.name, description: action.description, deadline: action.deadline, tasks: [] } };
    case 'setDraftTasks':
      return state.draft ? { ...state, draft: { ...state.draft, tasks: action.tasks } } : state;
    case 'updateDraftTask':
      return state.draft
        ? { ...state, draft: { ...state.draft, tasks: state.draft.tasks.map((t) => (t.key === action.key ? { ...t, ...action.changes } : t)) } }
        : state;
    case 'deleteDraftTask':
      return state.draft
        ? {
            ...state,
            draft: {
              ...state.draft,
              tasks: state.draft.tasks.filter((t) => t.key !== action.key).map((t) => (t.dependsOnKey === action.key ? { ...t, dependsOnKey: null } : t)),
            },
          }
        : state;
    case 'addDraftTask':
      return state.draft
        ? { ...state, draft: { ...state.draft, tasks: [...state.draft.tasks, { key: action.key, title: '새 작업', estimatedHours: 1, dependsOnKey: null, prerequisite: false }] } }
        : state;
    case 'confirmDraft': {
      const draft = state.draft;
      if (!draft) return state;
      const idByKey = new Map(draft.tasks.map((t) => [t.key, createId('t')]));
      const tasks: Task[] = draft.tasks.map((t) => ({
        id: idByKey.get(t.key)!,
        projectId: action.projectId,
        title: t.title,
        estimatedHours: t.estimatedHours,
        dependsOn: t.dependsOnKey ? (idByKey.get(t.dependsOnKey) ?? null) : null,
        scheduledDate: null,
        spanDays: 1,
        dueDate: null,
        done: false,
        prerequisite: t.prerequisite,
      }));
      const project: Project = {
        id: action.projectId,
        name: draft.name,
        short: draft.name,
        description: draft.description,
        deadline: draft.deadline,
        status: 'active',
        color: nextProjectColor(state.projects),
      };
      return { ...state, projects: [...state.projects, project], tasks: [...state.tasks, ...tasks], draft: null };
    }
  }
}

function mapTasks(state: State, fn: (t: Task) => Task): State {
  return { ...state, tasks: state.tasks.map(fn) };
}

/** 아직 쓰지 않은 프로젝트 색을 먼저, 다 쓰면 순환 (사용자가 색을 고르는 기능은 미정) */
function nextProjectColor(projects: Project[]) {
  const unused = projectColorOrder.find((c) => !projects.some((p) => p.color === c));
  return unused ?? projectColorOrder[projects.length % projectColorOrder.length];
}

/* ---------- selectors ---------- */

export type Tone = 'soft' | 'near' | 'over';

const hoursOf = (t: Task) => t.estimatedHours ?? 0;

export function isOverdue(task: Task, today: DateKey): boolean {
  return !task.done && task.scheduledDate !== null && task.scheduledDate < today;
}

export function selectOverdueTasks(state: State, today: DateKey): Task[] {
  return state.tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
}

/** 오늘 할 일: 오늘 예정 + 밀린 작업. 지연 → 마감 가까운 순 → 완료는 맨 뒤 */
export function selectTodayTasks(state: State, today: DateKey): Task[] {
  const list = state.tasks.filter((t) => t.scheduledDate === today || isOverdue(t, today));
  const rank = (t: Task) => (t.done ? 2 : isOverdue(t, today) ? 0 : 1);
  return list.sort((a, b) => rank(a) - rank(b) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

/** 정상 soft / 임박(D-1~D-Day) near / 지연 over */
export function taskTone(task: Task, today: DateKey): Tone {
  if (task.done || !task.dueDate) return 'soft';
  const remaining = diffInDays(today, task.dueDate);
  if (remaining < 0) return 'over';
  return remaining <= 1 ? 'near' : 'soft';
}

/** 하루 가용 시간 = 주간 가용 시간 ÷ 5 (주 5일 기준 — 기준 자체는 미정) */
export function dailyCapacity(settings: Settings): number {
  return settings.weeklyAvailableHours / 5;
}

/** 하루 부하. includeOverdue면(오늘 화면) 밀린 작업까지 오늘 할 일로 센다 */
export function selectDayLoad(state: State, date: DateKey, { includeOverdue = false } = {}) {
  const tasks = includeOverdue ? selectTodayTasks(state, date) : state.tasks.filter((t) => t.scheduledDate === date);
  const events = state.events.filter((e) => e.date === date);
  const hours = tasks.reduce((a, t) => a + hoursOf(t), 0) + events.reduce((a, e) => a + e.hours, 0);
  const capacity = dailyCapacity(state.settings);
  return { hours, capacity, over: hours > capacity };
}

export type DayItem = { kind: 'task' | 'event' | 'due'; projectId: string; title: string; hours: number; due: boolean; taskId?: string };

/** 날짜별 항목(달력용): 그날 작업 + 고정 일정 + 그날 마감인 프로젝트 */
export function selectDayItems(state: State, date: DateKey): DayItem[] {
  const tasks: DayItem[] = state.tasks
    .filter((t) => t.scheduledDate === date)
    .map((t) => ({ kind: 'task', projectId: t.projectId, title: t.title, hours: hoursOf(t), due: false, taskId: t.id }));
  const events: DayItem[] = state.events.filter((e) => e.date === date).map((e) => ({ kind: 'event', projectId: e.projectId, title: e.title, hours: e.hours, due: false }));
  const dues: DayItem[] = state.projects
    .filter((p) => p.deadline === date)
    .map((p) => ({ kind: 'due', projectId: p.id, title: `${p.name} 마감`, hours: 0, due: true }));
  return [...tasks, ...events, ...dues];
}

/** 이번 주(월~일) 부하: 남은 작업 + 밀린 작업 시간 합, 주간 가용 시간, 미룰 후보(시간 큰 순) */
export function selectWeekLoad(state: State, today: DateKey) {
  const days = weekDays(today);
  const candidates = state.tasks
    .filter((t) => !t.done && t.scheduledDate !== null && (days.includes(t.scheduledDate) || t.scheduledDate < today))
    .sort((a, b) => hoursOf(b) - hoursOf(a));
  const estimated = candidates.reduce((a, t) => a + hoursOf(t), 0);
  return { estimated, available: state.settings.weeklyAvailableHours, candidates };
}

/** 프로젝트 목록: 상태로 거르고 마감 가까운 순, 상시(마감 없음)는 뒤 */
export function selectProjects(state: State, status: Project['status']): Project[] {
  return state.projects.filter((p) => p.status === status).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
}

export function selectProjectSummary(state: State, projectId: string, today: DateKey) {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const done = tasks.filter((t) => t.done).length;
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const next = tasks.filter((t) => !t.done).sort((a, b) => (a.scheduledDate ?? '9999').localeCompare(b.scheduledDate ?? '9999'))[0];
  const note = overdue.length > 0 ? `지연 ${overdue.length}건 · ${overdue[0].title}` : next ? `다음: ${next.title}` : '모든 작업을 끝냈어요';
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0, note, late: overdue.length > 0 };
}

/** 프로젝트 일정(간트)에 보여줄 날짜 범위: 오늘 이틀 전부터 9일 */
export function selectGanttRange(today: DateKey): DateKey[] {
  return Array.from({ length: 9 }, (_, i) => addDays(today, i - 2));
}
