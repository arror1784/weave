import { request } from './client';
import { chatResponseSchema } from './types';

/** 대화에 실어 보내는 작업 한 줄 — 앞서 받은 제안(assistant)이나 직접 고친 목록(user). 선행 작업은 제목으로 */
export type ChatTask = { title: string; description: string; estimatedHours: number; dependsOnTitle: string | null; prerequisite: boolean };
/** assumptions는 화면 표시용 — 서버로는 보내지 않는다 */
export type ChatTurn = { role: 'user' | 'assistant'; text: string; tasks?: ChatTask[]; assumptions?: string[] };
export type ChatProject = {
  name: string;
  description: string;
  deadline: string | null;
  deliverable: string;
  progress: string;
  /** "AI에게 재요청"일 때 이미 끝낸 작업 제목 */
  completedTasks?: string[];
};

/**
 * 등록 2단계 AI 챗봇 — 서버가 Claude API를 부른다(앱은 AI API를 직접 부르지 않는다, §3-11).
 * 서버는 대화를 저장하지 않아서 매번 전체 대화와 첨부 id를 보낸다.
 */
/** conversationId: 같은 등록 흐름의 요청을 사용 기록에서 묶는 번호 */
export const sendChat = (project: ChatProject, messages: ChatTurn[], attachmentIds: number[], conversationId?: string) =>
  request('/api/v1/project-chat', chatResponseSchema, {
    method: 'POST',
    body: { project, messages: messages.map(({ role, text, tasks }) => (tasks ? { role, text, tasks } : { role, text })), attachmentIds, ...(conversationId ? { conversationId } : {}) },
  });

