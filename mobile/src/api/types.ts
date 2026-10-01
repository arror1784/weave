import { z } from 'zod';

// 서버 응답은 경계에서 Zod로 검증한다(mobile/CLAUDE.md §2-5). 모양은 백엔드 DTO와 같다(camelCase).

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const projectColorSchema = z.enum(['teal', 'magenta', 'violet', 'blue', 'green', 'amber', 'brown']);

export const userSchema = z.object({ id: z.number(), email: z.string(), dailyAvailableHours: z.number() });
export const tokenSchema = z.object({ accessToken: z.string(), refreshToken: z.string(), expiresIn: z.number(), user: userSchema });

/** 서버가 날짜별로 배정한 작업 시간 */
export const dayHoursSchema = z.object({ date: dateKey, hours: z.number() });

export const taskSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  /** 목표·범위·완료 기준 (AI가 제안) */
  description: z.string(),
  estimatedHours: z.number().nullable(),
  dependsOnId: z.number().nullable(),
  scheduledDate: dateKey.nullable(),
  spanDays: z.number(),
  /** 날짜별 배정 시간 — 하루에 최대한 채워 앞당긴다(4시간·하루 3시간 → 3 + 1) */
  days: z.array(dayHoursSchema),
  /** 작업 마감일 — 상시 프로젝트(마감 없음)면 null */
  dueDate: dateKey.nullable(),
  done: z.boolean(),
  prerequisite: z.boolean(),
  /** 밀려서 서버가 오늘로 옮긴 작업의 원래 끝나는 날 — 있으면 "지연" */
  delayedFrom: dateKey.nullable(),
});

export const projectBriefSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  deadline: dateKey.nullable(),
  status: z.enum(['active', 'done']),
  color: projectColorSchema,
});

export const attachmentSchema = z.object({
  id: z.number(),
  kind: z.enum(['link', 'file', 'image']),
  name: z.string(),
  url: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number().optional(),
});

export const projectDetailSchema = projectBriefSchema.extend({
  /** 결과물 형태·기 진행사항 — "AI에게 재요청" 때 다시 채운다. 2026-10-02 전에 등록한 프로젝트는 빈 값 */
  deliverable: z.string().default(''),
  progress: z.string().default(''),
  tasks: z.array(taskSchema),
  attachments: z.array(attachmentSchema),
});
export const createProjectResponseSchema = z.object({ project: projectDetailSchema, lateCount: z.number() });

export const projectSummarySchema = projectBriefSchema.extend({
  doneCount: z.number(),
  totalCount: z.number(),
  overdueCount: z.number(),
  firstOverdueTitle: z.string().nullable(),
  nextTaskTitle: z.string().nullable(),
});

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() });

export const scheduleSchema = z.object({
  today: dateKey,
  dailyAvailableHours: z.number(),
  projects: z.array(projectBriefSchema),
  tasks: z.array(taskSchema),
});

export const updateTaskResponseSchema = z.object({ task: taskSchema, projectAllDone: z.boolean() });

export const proposedTaskSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  dependsOnKey: z.string().nullable(),
  prerequisite: z.boolean(),
  /** AI가 역산한 마감일 — 참고용(저장·표시는 서버 일정 알고리즘이 정한 날짜) */
  aiDueDate: dateKey.nullable(),
});

export const chatResponseSchema = z.object({
  type: z.enum(['question', 'tasks']),
  message: z.string(),
  tasks: z.array(proposedTaskSchema).optional(),
  /** AI가 가정한 것·일정이 빠듯한 작업 안내 */
  assumptions: z.array(z.string()).optional(),
});

export type User = z.infer<typeof userSchema>;
export type Tokens = z.infer<typeof tokenSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectBriefSchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type ProposedTask = z.infer<typeof proposedTaskSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number };
