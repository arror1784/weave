import { z } from 'zod';

// 서버 응답은 경계에서 Zod로 검증한다(mobile/CLAUDE.md §2-5). 모양은 백엔드 DTO와 같다(camelCase).

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const projectColorSchema = z.enum(['teal', 'magenta', 'violet', 'blue', 'green', 'amber', 'brown']);

/** standingSessions…: 상시(마감 없는) 프로젝트에 떼어 두는 칸 — 주 몇 번 × 한 번에 몇 시간(사용자 결정 2026-10-17) */
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  /** 오늘 요일의 가용 시간(요일별 전 앱용) */
  dailyAvailableHours: z.number(),
  /** 요일별 가용 시간 — 월요일부터 7개, 0이면 쉬는 날(사용자 결정 2026-10-17) */
  weeklyAvailableHours: z.array(z.number()).length(7),
  /** 공휴일 가용 시간 — 공휴일은 요일보다 우선 */
  holidayAvailableHours: z.number(),
  standingSessionsPerWeek: z.number(),
  standingSessionHours: z.number(),
});
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
  /** 오늘 가용 시간(공휴일이면 공휴일 값) */
  dailyAvailableHours: z.number(),
  /** 날짜별 가용 시간 계산용(lib/schedule capacityOn) — 월요일부터 7개 · 공휴일 값 · 앞뒤 공휴일 날짜 */
  weeklyAvailableHours: z.array(z.number()).length(7).optional(),
  holidayAvailableHours: z.number().optional(),
  holidays: z.array(dateKey).optional(),
  /** 서버가 계산한 날짜별 가용 시간(요일·공휴일 − 개인 일정) */
  availableHoursByDate: z.record(z.string(), z.number()).optional(),
  /** 날짜별 개인 일정(오늘 화면·달력 표시용) */
  /** 이어진 일정(2026-10-23)은 날마다 그날 부분 — fromPreviousDay·toNextDay로 '~12:00'·'하루 종일'·'14:00~' (옛 서버엔 없음) */
  events: z
    .array(
      z.object({
        eventId: z.number(),
        date: dateKey,
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        fromPreviousDay: z.boolean().optional(),
        toNextDay: z.boolean().optional(),
      }),
    )
    .optional(),
  projects: z.array(projectBriefSchema),
  tasks: z.array(taskSchema),
});

/**
 * 개인 일정(사용자 결정 2026-10-17) — 매주 반복(weekdays: 월 1 … 일 7, 기간) 또는 한 번. 시각은 HH:mm.
 * 한 번(2026-10-23): 날짜 지정(dates — 같은 시각) 또는 이어진 일정(untilDate — date startTime ~ untilDate endTime). 옛 서버엔 dates·untilDate가 없다.
 */
export const personalEventSchema = z.object({
  id: z.number(),
  title: z.string(),
  repeat: z.enum(['weekly', 'once']),
  weekdays: z.array(z.number()),
  date: dateKey.nullable(),
  dates: z.array(dateKey).default([]),
  untilDate: dateKey.nullable().default(null),
  startTime: z.string(),
  endTime: z.string(),
  startDate: dateKey.nullable(),
  endDate: dateKey.nullable(),
});

/** projectReopened: 완료한 프로젝트의 작업 체크를 풀어 진행중으로 돌아갔다(2026-10-18 — 옛 서버엔 없음) */
export const updateTaskResponseSchema = z.object({ task: taskSchema, projectAllDone: z.boolean(), projectReopened: z.boolean().optional() });

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
export type PersonalEvent = z.infer<typeof personalEventSchema>;
export type EventOccurrence = NonNullable<Schedule['events']>[number];
export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number };
