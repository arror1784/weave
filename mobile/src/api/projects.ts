import { request } from './client';
import {
  createProjectResponseSchema,
  pageSchema,
  projectDetailSchema,
  projectSummarySchema,
  scheduleSchema,
  updateTaskResponseSchema,
  type Project,
} from './types';

export type NewProject = {
  name: string;
  description: string;
  deadline: string | null;
  color: Project['color'];
  tasks: { key: string; title: string; estimatedHours: number; dependsOnKey: string | null; prerequisite: boolean }[];
  attachmentIds: number[];
};

/** 오늘·전체 일정·과부하·위젯이 함께 쓰는 스냅샷 (진행중 프로젝트와 그 작업) */
export const getSchedule = () => request('/api/v1/schedule', scheduleSchema);

/** 작업 다시 배치(설정 버튼) — 밀린 작업까지 오늘부터 다시 배치한 일정 */
export const replanSchedule = () => request('/api/v1/schedule/replan', scheduleSchema, { method: 'POST' });

export const listProjects = (status: Project['status'], page: number, size = 20) =>
  request(`/api/v1/projects?status=${status}&page=${page}&size=${size}`, pageSchema(projectSummarySchema));

export const getProject = (id: number) => request(`/api/v1/projects/${id}`, projectDetailSchema);

/** 등록 — 서버가 임시 일정 알고리즘으로 작업 날짜를 정한다 */
export const createProject = (project: NewProject) => request('/api/v1/projects', createProjectResponseSchema, { method: 'POST', body: project });

export const updateProject = (id: number, changes: { color?: Project['color']; status?: 'done' }) =>
  request(`/api/v1/projects/${id}`, projectDetailSchema, { method: 'PATCH', body: changes });

/** 삭제 — 작업·첨부 파일까지 서버가 지운다. 상시 프로젝트를 끝낼 때(사용자 결정 2026-10-01) */
export const deleteProject = (id: number) => request(`/api/v1/projects/${id}`, null, { method: 'DELETE' });

/** 작업은 완료 여부만 바꿀 수 있다(사용자 결정 B) */
export const setTaskDone = (id: number, done: boolean) => request(`/api/v1/tasks/${id}`, updateTaskResponseSchema, { method: 'PATCH', body: { done } });
