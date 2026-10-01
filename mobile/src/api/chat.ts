import { request } from './client';
import { chatResponseSchema } from './types';

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

/** 등록 2단계 AI 챗봇 — 서버가 Claude API를 부른다(앱은 AI API를 직접 부르지 않는다, §3-11) */
export const sendChat = (project: { name: string; description: string; deadline: string | null }, messages: ChatTurn[]) =>
  request('/api/v1/project-chat', chatResponseSchema, { method: 'POST', body: { project, messages } });
