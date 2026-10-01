import type { ChatTurn } from '@/api/chat';
import type { Attachment, Project } from '@/api/types';
import type { DateKey } from '@/lib/date';

// 등록 3단계(기본 정보 → AI 챗봇 → 작업 검토)가 함께 쓰는 초안 — 등록 완료 전까지 기기에만 있는 UI 상태.

export type DraftTask = { key: string; title: string; estimatedHours: number; dependsOnKey: string | null; prerequisite: boolean };

export type Draft = {
  name: string;
  description: string;
  deadline: DateKey | null;
  color: Project['color'];
  attachments: Attachment[];
  chat: ChatTurn[];
  tasks: DraftTask[];
};

export type DraftAction =
  | { type: 'start'; name: string; description: string; deadline: DateKey | null; color: Project['color']; attachments: Attachment[] }
  | { type: 'setChat'; chat: ChatTurn[] }
  | { type: 'setTasks'; tasks: DraftTask[] }
  | { type: 'updateTask'; key: string; changes: Partial<Omit<DraftTask, 'key'>> }
  | { type: 'deleteTask'; key: string }
  | { type: 'addTask'; key: string }
  | { type: 'reset' };

export function draftReducer(draft: Draft | null, action: DraftAction): Draft | null {
  switch (action.type) {
    case 'start':
      return { name: action.name, description: action.description, deadline: action.deadline, color: action.color, attachments: action.attachments, chat: [], tasks: [] };
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
      return { ...draft, tasks: [...draft.tasks, { key: action.key, title: '새 작업', estimatedHours: 1, dependsOnKey: null, prerequisite: false }] };
  }
}

let sequence = 0;
/** 초안 안에서만 쓰는 임시 key */
export function newKey(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}
