import { z } from 'zod';

// 서버 응답은 경계에서 Zod로 검증한다(mobile/CLAUDE.md §2-5). 모양은 백엔드 DTO와 같다(camelCase).

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const projectColorSchema = z.enum(['teal', 'magenta', 'violet', 'gray', 'blue', 'green', 'amber', 'brown']);

export const userSchema = z.object({ id: z.number(), email: z.string(), dailyAvailableHours: z.number() });
export const tokenSchema = z.object({ accessToken: z.string(), refreshToken: z.string(), expiresIn: z.number(), user: userSchema });

export const taskSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  estimatedHours: z.number().nullable(),
  dependsOnId: z.number().nullable(),
  scheduledDate: dateKey.nullable(),
  spanDays: z.number(),
  dueDate: dateKey.nullable(),
  done: z.boolean(),
  prerequisite: z.boolean(),
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

export const projectDetailSchema = projectBriefSchema.extend({ tasks: z.array(taskSchema), attachments: z.array(attachmentSchema) });
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
  estimatedHours: z.number(),
  dependsOnKey: z.string().nullable(),
  prerequisite: z.boolean(),
});

export const chatResponseSchema = z.object({
  type: z.enum(['question', 'tasks']),
  message: z.string(),
  questionNumber: z.number(),
  totalQuestions: z.number(),
  tasks: z.array(proposedTaskSchema).optional(),
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
