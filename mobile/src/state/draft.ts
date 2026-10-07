import type { ChatTask, ChatTurn } from '@/api/chat';
import type { Attachment, ChatResponse, Project, ProposedTask } from '@/api/types';
import type { DateKey } from '@/lib/date';

// 등록 3단계(기본 정보 → AI 챗봇 → 작업 검토)가 함께 쓰는 초안 — 등록 완료 전까지 기기에만 있는 UI 상태.

export type DraftTask = Pick<ProposedTask, 'key' | 'title' | 'description' | 'estimatedHours' | 'dependsOnKey' | 'prerequisite' | 'aiDueDate'>;

export type Draft = {
  name: string;
  description: string;
  deadline: DateKey | null;
  /** 결과물 형태 (예: 보고서, 발표자료, 앱) */
  deliverable: string;
  /** 기 진행사항 (이미 해 둔 작업) */
  progress: string;
  color: Project['color'];
  attachments: Attachment[];
  chat: ChatTurn[];
  tasks: DraftTask[];
  /** "AI에게 재요청" 중인 기존 프로젝트 — 있으면 등록 완료가 새로 만들지 않고 그 프로젝트의 미완료 작업을 바꾼다(사용자 결정 2026-10-02) */
  projectId?: number;
  /** 재요청 때 이미 끝낸 작업 제목 — AI가 다시 제안하지 않게 알린다 */
  completedTasks?: string[];
  /** 대화 묶음 번호 — 등록(재요청) 흐름을 시작할 때 만들어 챗봇 요청·등록 완료에 함께 보낸다(사용 기록, 2026-10-07) */
  conversationId?: string;
};

export type DraftAction =
  | {
      type: 'start';
      name: string;
      description: string;
      deadline: DateKey | null;
      deliverable: string;
      progress: string;
      color: Project['color'];
      attachments: Attachment[];
      projectId?: number;
      completedTasks?: string[];
    }
  | { type: 'setChat'; chat: ChatTurn[] }
  | { type: 'setTasks'; tasks: DraftTask[] }
  | { type: 'updateTask'; key: string; changes: Partial<Omit<DraftTask, 'key'>> }
  | { type: 'deleteTask'; key: string }
  | { type: 'addTask'; key: string }
  | { type: 'moveTask'; key: string; offset: -1 | 1 }
  | { type: 'reset' };

export function draftReducer(draft: Draft | null, action: DraftAction): Draft | null {
  switch (action.type) {
    case 'start':
      return {
        name: action.name,
        description: action.description,
        deadline: action.deadline,
        deliverable: action.deliverable,
        progress: action.progress,
        color: action.color,
        attachments: action.attachments,
        chat: [],
        tasks: [],
        conversationId: newConversationId(),
        ...(action.projectId !== undefined ? { projectId: action.projectId, completedTasks: action.completedTasks ?? [] } : {}),
      };
    case 'reset':
      return null;
  }
  if (!draft) return draft;
  switch (action.type) {
    case 'setChat':
      return { ...draft, chat: action.chat };
    case 'setTasks':
      return { ...draft, tasks: action.tasks };
    case 'updateTask':
      return { ...draft, tasks: draft.tasks.map((t) => (t.key === action.key ? { ...t, ...action.changes } : t)) };
    case 'deleteTask':
      return { ...draft, tasks: draft.tasks.filter((t) => t.key !== action.key).map((t) => (t.dependsOnKey === action.key ? { ...t, dependsOnKey: null } : t)) };
    case 'moveTask': {
      if (!canMoveTask(draft.tasks, action.key, action.offset)) return draft;
      const tasks = [...draft.tasks];
      const i = tasks.findIndex((t) => t.key === action.key);
      [tasks[i], tasks[i + action.offset]] = [tasks[i + action.offset], tasks[i]];
      return { ...draft, tasks };
    }
    case 'addTask':
      return { ...draft, tasks: [...draft.tasks, { key: action.key, title: '새 작업', description: '', estimatedHours: 1, dependsOnKey: null, prerequisite: false, aiDueDate: null }] };
  }
}

/**
 * 순서 바꾸기는 이웃과 자리를 바꾸되, 선행 작업이 뒤따르는 작업보다 아래로 가면 막는다(사용자 결정 2026-10-01 — 의존성을 지키는 한해서).
 * 서버는 선행 작업을 먼저 배치하므로 막지 않아도 일정은 맞지만, 목록 순서가 실제 순서와 어긋나 보이지 않게 한다.
 */
export function canMoveTask(tasks: DraftTask[], key: string, offset: -1 | 1): boolean {
  const i = tasks.findIndex((t) => t.key === key);
  const j = i + offset;
  if (i < 0 || j < 0 || j >= tasks.length) return false;
  const [upper, lower] = offset < 0 ? [tasks[j], tasks[i]] : [tasks[i], tasks[j]];
  return lower.dependsOnKey !== upper.key;
}

/** 대화 묶음 번호 — 시각 + 무작위 (영문·숫자·하이픈, 서버 형식 [A-Za-z0-9_-]{1,64}) */
export function newConversationId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let sequence = 0;
/** 초안 안에서만 쓰는 임시 key */
export function newKey(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

/** 초안 작업 → 대화에 실어 보낼 모양 (선행 작업은 key 대신 제목으로 — AI는 제목으로 이어 준다) */
export function toChatTasks(tasks: DraftTask[]): ChatTask[] {
  return tasks.map((t) => ({
    title: t.title,
    description: t.description,
    estimatedHours: t.estimatedHours,
    dependsOnTitle: tasks.find((x) => x.key === t.dependsOnKey)?.title ?? null,
    prerequisite: t.prerequisite,
  }));
}

/** 초안 → 챗봇에 보낼 프로젝트 정보 */
export function chatProject(d: Draft) {
  const project = { name: d.name, description: d.description, deadline: d.deadline, deliverable: d.deliverable, progress: d.progress };
  return d.completedTasks?.length ? { ...project, completedTasks: d.completedTasks } : project;
}

/** AI 응답 → 대화 기록 한 턴. 작업 제안이면 목록(선행 작업은 제목으로)과 가정을 함께 남긴다 — 다음 요청 때 그대로 다시 보낸다 */
export function assistantTurn(r: ChatResponse): ChatTurn {
  if (r.type !== 'tasks' || !r.tasks) return { role: 'assistant', text: r.message };
  const tasks = r.tasks;
  return {
    role: 'assistant',
    text: r.message,
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description,
      estimatedHours: t.estimatedHours,
      dependsOnTitle: tasks.find((x) => x.key === t.dependsOnKey)?.title ?? null,
      prerequisite: t.prerequisite,
    })),
    assumptions: r.assumptions ?? [],
  };
}
