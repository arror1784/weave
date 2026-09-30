import type { DateKey } from '@/lib/date';
import type { ProjectColorKey } from '@/theme/colors';

// ⚠ UI 확인용 목업 모델. 백엔드 API가 생기면 API 응답 타입(Zod 스키마)으로 대체한다.

export type Project = {
  id: string;
  name: string;
  /** 달력 범례 등 좁은 곳에 쓰는 짧은 이름 */
  short: string;
  description: string;
  /** 프로젝트 마감일. null이면 상시 */
  deadline: DateKey | null;
  status: 'active' | 'done';
  color: ProjectColorKey;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  /** 예상 소요 시간(시간). 모르면 null */
  estimatedHours: number | null;
  /** 선행 작업 하나 (Figma: 작업마다 선행 작업은 최대 1개) */
  dependsOn: string | null;
  /** 서비스가 배정한 수행 시작일. 일정 생성 알고리즘이 미정이라 새 작업은 null */
  scheduledDate: DateKey | null;
  /** 수행 기간(일) — 프로젝트 일정(간트)에서 막대 길이 */
  spanDays: number;
  /** 작업 마감일 (D-day 표시) */
  dueDate: DateKey | null;
  done: boolean;
  /** AI가 "선행 학습"으로 넣은 작업 */
  prerequisite: boolean;
};

/** 시간이 정해진 고정 일정 (예: 정기 회의) */
export type ScheduleEvent = {
  id: string;
  projectId: string;
  title: string;
  date: DateKey;
  time: string;
  hours: number;
};

export type DraftTask = {
  key: string;
  title: string;
  estimatedHours: number;
  /** 같은 초안 안의 선행 작업 key */
  dependsOnKey: string | null;
  prerequisite: boolean;
};

export type Draft = {
  name: string;
  description: string;
  deadline: DateKey | null;
  tasks: DraftTask[];
};

export type Settings = {
  /** 주간 가용 시간 — 과부하 기준 */
  weeklyAvailableHours: number;
};

export type State = {
  session: { email: string } | null;
  projects: Project[];
  tasks: Task[];
  events: ScheduleEvent[];
  draft: Draft | null;
  settings: Settings;
};
