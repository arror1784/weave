import type { DateKey } from '@/lib/date';

// ⚠ UI 확인용 목업 모델. 백엔드 API가 생기면 API 응답 타입(Zod 스키마)으로 대체한다.

export type Project = {
  id: string;
  name: string;
  description: string;
  /** 마감일 — 입력 위치(기본 정보 / 챗봇)는 미정 */
  deadline: DateKey | null;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  /** 예상 소요 시간(시간). 모르면 null */
  estimatedHours: number | null;
  dependsOn: string[];
  /** 서비스가 배정한 수행 예정일. 일정 생성 알고리즘이 미정이라 새 작업은 null */
  scheduledDate: DateKey | null;
  done: boolean;
};

export type DraftTask = { title: string; estimatedHours: number | null };

export type Draft = {
  name: string;
  description: string;
  tasks: DraftTask[];
};

export type State = {
  session: { email: string } | null;
  projects: Project[];
  tasks: Task[];
  draft: Draft | null;
};
