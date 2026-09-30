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
  /** 일정 알고리즘이 배정한 수행 시작일 (src/lib/scheduler.ts — 임시안). null이면 미배정 */
  scheduledDate: DateKey | null;
  /** 수행 기간(일). 소요 시간을 이 기간에 똑같이 나눠 하루 몫으로 센다 */
  spanDays: number;
  /** 작업 마감일 (D-day 표시) */
  dueDate: DateKey | null;
  done: boolean;
  /** AI가 "선행 학습"으로 넣은 작업 */
  prerequisite: boolean;
};

/** 등록할 때 첨부한 참고자료 (앱 쪽만 구현 — AI로 보내는 것은 백엔드 연동 때) */
export type Attachment = {
  id: string;
  kind: 'link' | 'file' | 'image';
  /** 목록에 보여줄 이름 (링크는 주소, 파일·사진은 파일 이름) */
  name: string;
  uri: string;
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
  color: ProjectColorKey;
  attachments: Attachment[];
  tasks: DraftTask[];
};

export type Settings = {
  /** 하루 가용 시간 — 일정 배정·과부하 기준 (기본 3시간, 사용자 결정 E) */
  dailyAvailableHours: number;
};

export type State = {
  session: { email: string } | null;
  projects: Project[];
  tasks: Task[];
  draft: Draft | null;
  settings: Settings;
  /** 마지막 작업을 끝내서 "프로젝트가 완료되었습니까?"를 물어볼 프로젝트 */
  completionPrompt: string | null;
};
