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
};

export type DraftAction =
  | { type: 'start'; name: string; description: string; deadline: DateKey | null; deliverable: string; progress: string; color: Project['color']; attachments: Attachment[] }
  | { type: 'setChat'; chat: ChatTurn[] }
  | { type: 'setTasks'; tasks: DraftTask[] }
  | { type: 'updateTask'; key: string; changes: Partial<Omit<DraftTask, 'key'>> }
  | { type: 'deleteTask'; key: string }
  | { type: 'addTask'; key: string }
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
    case 'addTask':
      return { ...draft, tasks: [...draft.tasks, { key: action.key, title: '새 작업', description: '', estimatedHours: 1, dependsOnKey: null, prerequisite: false, aiDueDate: null }] };
  }
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
  return { name: d.name, description: d.description, deadline: d.deadline, deliverable: d.deliverable, progress: d.progress };
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
