import { addDays, diffInDays, weekDays, type DateKey } from '@/lib/date';
import { scheduleNewTasks, taskEndDate, taskHoursOn } from '@/lib/scheduler';
import { projectColorOrder, type ProjectColorKey } from '@/theme/colors';

import type { Attachment, DraftTask, Project, Settings, State, Task } from './types';

// ⚠ UI 확인용 목업 상태. 서버 데이터는 나중에 TanStack Query(서버 상태)로 옮기고,
//   여기엔 UI 상태만 남긴다(mobile/CLAUDE.md §2-4).

export const initialState: State = {
  session: null,
  projects: [],
  tasks: [],
  draft: null,
  settings: { dailyAvailableHours: 3 },
  completionPrompt: null,
};

export type Action =
  | { type: 'signIn'; email: string }
  | { type: 'signOut' }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'completeProject'; projectId: string }
  | { type: 'dismissCompletionPrompt' }
  | { type: 'setProjectColor'; projectId: string; color: ProjectColorKey }
  | { type: 'setDailyHours'; hours: number }
  | { type: 'startDraft'; name: string; description: string; deadline: DateKey | null; color: ProjectColorKey; attachments: Attachment[] }
  | { type: 'setDraftTasks'; tasks: DraftTask[] }
  | { type: 'updateDraftTask'; key: string; changes: Partial<Omit<DraftTask, 'key'>> }
  | { type: 'deleteDraftTask'; key: string }
  | { type: 'addDraftTask'; key: string }
  | { type: 'confirmDraft'; projectId: string; today: DateKey };

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
    case 'toggleTask': {
      // 등록된 작업은 완료 체크만 할 수 있다 — 수정·삭제·추가·미루기 없음(사용자 결정 B — 바뀔 수 있음)
      const next = mapTasks(state, (t) => (t.id === action.taskId ? { ...t, done: !t.done } : t));
      const toggled = next.tasks.find((t) => t.id === action.taskId);
      const project = toggled && next.projects.find((p) => p.id === toggled.projectId);
      const allDone = !!toggled?.done && next.tasks.filter((t) => t.projectId === toggled.projectId).every((t) => t.done);
      return { ...next, completionPrompt: allDone && project?.status === 'active' ? project.id : null };
    }
    case 'completeProject':
      return { ...state, projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, status: 'done' } : p)), completionPrompt: null };
    case 'dismissCompletionPrompt':
      return { ...state, completionPrompt: null };
    case 'setProjectColor':
      return { ...state, projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, color: action.color } : p)) };
    case 'setDailyHours':
      return { ...state, settings: { ...state.settings, dailyAvailableHours: action.hours } };
    case 'startDraft':
      return {
        ...state,
        draft: { name: action.name, description: action.description, deadline: action.deadline, color: action.color, attachments: action.attachments, tasks: [] },
      };
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
      const placements = new Map(previewDraftSchedule(state, action.today).placements.map((p) => [p.key, p]));
      const tasks: Task[] = draft.tasks.map((t) => ({
        id: idByKey.get(t.key)!,
        projectId: action.projectId,
        title: t.title,
        estimatedHours: t.estimatedHours,
        dependsOn: t.dependsOnKey ? (idByKey.get(t.dependsOnKey) ?? null) : null,
        scheduledDate: placements.get(t.key)!.scheduledDate,
        spanDays: placements.get(t.key)!.spanDays,
        dueDate: placements.get(t.key)!.dueDate,
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
        color: draft.color,
      };
      return { ...state, projects: [...state.projects, project], tasks: [...state.tasks, ...tasks], draft: null };
    }
  }
}

function mapTasks(state: State, fn: (t: Task) => Task): State {
  return { ...state, tasks: state.tasks.map(fn) };
}

/** 새 프로젝트 색의 기본값: 아직 쓰지 않은 색을 먼저, 다 쓰면 순환. 사용자가 바꿀 수 있다. */
export function suggestProjectColor(state: State): ProjectColorKey {
  const unused = projectColorOrder.find((c) => !state.projects.some((p) => p.color === c));
  return unused ?? projectColorOrder[state.projects.length % projectColorOrder.length];
}

/** 등록 중인 초안의 작업을 임시 일정 알고리즘으로 배정해 본 결과 (등록 완료 시 그대로 쓴다) */
export function previewDraftSchedule(state: State, today: DateKey) {
  const draft = state.draft;
  if (!draft) return { placements: [], lateCount: 0 };
  const placements = scheduleNewTasks({
    tasks: draft.tasks.map((t) => ({ key: t.key, hours: t.estimatedHours, dependsOnKey: t.dependsOnKey })),
    deadline: draft.deadline,
    today,
    capacity: dailyCapacity(state.settings),
    existing: state.tasks,
  });
  return { placements, lateCount: placements.filter((p) => p.late).length };
}

/* ---------- selectors ---------- */

export type Tone = 'soft' | 'near' | 'over';

const hoursOf = (t: Task) => t.estimatedHours ?? 0;

/** 끝나는 날(시작일 + 기간 − 1)이 지났는데 완료되지 않은 작업 */
export function isOverdue(task: Task, today: DateKey): boolean {
  const end = taskEndDate(task);
  return !task.done && end !== null && end < today;
}

/** 그날이 작업 기간(시작일 ~ 끝나는 날)에 들어가는지 */
function coversDate(task: Task, date: DateKey): boolean {
  const end = taskEndDate(task);
  return task.scheduledDate !== null && task.scheduledDate <= date && end !== null && date <= end;
}

export function selectOverdueTasks(state: State, today: DateKey): Task[] {
  return state.tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
}

/** 오늘 할 일: 오늘이 기간에 들어가는 작업 + 밀린 작업. 지연 → 마감 가까운 순 → 완료는 맨 뒤 */
export function selectTodayTasks(state: State, today: DateKey): Task[] {
  const list = state.tasks.filter((t) => coversDate(t, today) || isOverdue(t, today));
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

/** 하루 가용 시간 (설정 값, 기본 3시간 — 사용자 결정 E, 실제 계산은 미정) */
export function dailyCapacity(settings: Settings): number {
  return settings.dailyAvailableHours;
}

const round = (n: number) => Number(n.toFixed(2));

/** 하루 부하: 그날 몫(여러 날 작업은 하루 몫). includeOverdue면(오늘 화면) 밀린 작업 시간 전부를 더한다 */
export function selectDayLoad(state: State, date: DateKey, { includeOverdue = false } = {}) {
  const planned = state.tasks.reduce((a, t) => a + taskHoursOn(t, date), 0);
  const overdue = includeOverdue ? selectOverdueTasks(state, date).reduce((a, t) => a + hoursOf(t), 0) : 0;
  const hours = round(planned + overdue);
  const capacity = dailyCapacity(state.settings);
  return { hours, capacity, over: hours > capacity };
}

export type DayItem = { kind: 'task' | 'due'; projectId: string; title: string; hours: number; due: boolean; taskId?: string };

/** 날짜별 항목(달력용): 그날이 기간에 들어가는 작업(하루 몫 시간) + 그날 마감인 프로젝트 */
export function selectDayItems(state: State, date: DateKey): DayItem[] {
  const tasks: DayItem[] = state.tasks
    .filter((t) => coversDate(t, date))
    .map((t) => ({ kind: 'task', projectId: t.projectId, title: t.title, hours: round(taskHoursOn(t, date)), due: false, taskId: t.id }));
  const dues: DayItem[] = state.projects
    .filter((p) => p.deadline === date)
    .map((p) => ({ kind: 'due', projectId: p.id, title: `${p.name} 마감`, hours: 0, due: true }));
  return [...tasks, ...dues];
}

/** 이번 주(오늘~일요일) 부하: 남은 작업 몫 + 밀린 작업 vs 하루 가용 시간 × 남은 날 수. 작업은 시간 큰 순 */
export function selectWeekLoad(state: State, today: DateKey) {
  const days = weekDays(today).filter((d) => d >= today);
  const overdue = selectOverdueTasks(state, today);
  const upcoming = state.tasks.filter((t) => !t.done && !isOverdue(t, today) && days.some((d) => coversDate(t, d)));
  const estimated = round(overdue.reduce((a, t) => a + hoursOf(t), 0) + upcoming.reduce((a, t) => a + days.reduce((b, d) => b + taskHoursOn(t, d), 0), 0));
  const tasks = [...overdue, ...upcoming].sort((a, b) => hoursOf(b) - hoursOf(a));
  return { estimated, available: dailyCapacity(state.settings) * days.length, tasks };
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
