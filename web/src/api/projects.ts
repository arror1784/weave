import { request } from './client';
import { createProjectResponseSchema, pageSchema, projectDetailSchema, projectSummarySchema, type Project } from './types';

// 웹 범위(사용자 결정 2026-10-17: 등록 + AI 재요청)에 필요한 것만 — 앱(mobile/src/api/projects.ts)과 같은 요청이다.

export type NewProject = {
  name: string;
  description: string;
  deadline: string | null;
  color: Project['color'];
  deliverable: string;
  progress: string;
  tasks: { key: string; title: string; estimatedHours: number; dependsOnKey: string | null; prerequisite: boolean }[];
  attachmentIds: number[];
  /** 이 등록을 만든 AI 대화 번호 (사용 기록용) */
  conversationId?: string;
};

export const listProjects = (status: Project['status'], page: number, size = 20) =>
  request(`/api/v1/projects?status=${status}&page=${page}&size=${size}`, pageSchema(projectSummarySchema));

export const getProject = (id: number) => request(`/api/v1/projects/${id}`, projectDetailSchema);

/** 등록 — 서버가 임시 일정 알고리즘으로 작업 날짜를 정한다 */
export const createProject = (project: NewProject) => request('/api/v1/projects', createProjectResponseSchema, { method: 'POST', body: project });

/** "AI에게 재요청" 확정 — 기본 정보와 미완료 작업을 바꾼다(완료한 작업은 서버가 남긴다) */
export const replaceProjectTasks = (id: number, project: NewProject) =>
  request(`/api/v1/projects/${id}/replan-tasks`, createProjectResponseSchema, { method: 'POST', body: project });
