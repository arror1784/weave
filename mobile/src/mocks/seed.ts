import { addDays, type DateKey } from '@/lib/date';

import type { DraftTask, State, Task } from './types';

/**
 * ⚠ UI 확인용 예시 데이터 — Figma(Weave Make 디자인)의 예시를 옮겼다.
 * 날짜는 오늘 기준 상대값이라 언제 실행해도 "지연·임박·과부하"가 보인다.
 */
export function createSeed(today: DateKey): Pick<State, 'projects' | 'tasks'> {
  const d = (n: number) => addDays(today, n);
  const task = (t: Partial<Task> & Pick<Task, 'id' | 'projectId' | 'title'>): Task => ({
    estimatedHours: 1,
    dependsOn: null,
    scheduledDate: null,
    spanDays: 1,
    dueDate: null,
    done: false,
    prerequisite: false,
    ...t,
  });

  return {
    projects: [
      { id: 'p-embedded', name: '임베디드시스템 과제', short: '임베디드', description: 'STM32 센서 수집 시스템 설계 — 설계 문서, 보고서, 발표까지', deadline: d(9), status: 'active', color: 'teal' },
      { id: 'p-club', name: '창업동아리', short: '창업동아리', description: '가을 창업 행사 준비', deadline: d(17), status: 'active', color: 'magenta' },
      { id: 'p-algo', name: '알고리즘 스터디', short: '알고리즘', description: '매주 화요일 문제풀이', deadline: null, status: 'active', color: 'violet' },
    ],
    tasks: [
      // 임베디드
      task({ id: 'e-study', projectId: 'p-embedded', title: '개념 학습 (인터럽트)', estimatedHours: 2, scheduledDate: d(-3), spanDays: 2, dueDate: d(-2), done: true, prerequisite: true }),
      task({ id: 'e-design', projectId: 'p-embedded', title: '설계 문서 작성', estimatedHours: 3, dependsOn: 'e-study', scheduledDate: d(-1), spanDays: 1, dueDate: d(-1) }),
      task({ id: 'e-report', projectId: 'p-embedded', title: '보고서 v2 초안 작성', estimatedHours: 1.5, dependsOn: 'e-design', scheduledDate: today, spanDays: 3, dueDate: d(2) }),
      task({ id: 'e-review', projectId: 'p-embedded', title: '설계 문서 리뷰 반영', estimatedHours: 2, scheduledDate: today, spanDays: 2, dueDate: d(3) }),
      task({ id: 'e-slides', projectId: 'p-embedded', title: '발표자료 제작', estimatedHours: 2, scheduledDate: d(4), spanDays: 3, dueDate: d(8) }),
      // 창업동아리
      task({ id: 'c-venue', projectId: 'p-club', title: '행사 장소 섭외', estimatedHours: 1, scheduledDate: d(-2), dueDate: d(-2) }),
      task({ id: 'c-sponsor', projectId: 'p-club', title: '후원사 제안서 수정', estimatedHours: 1.25, scheduledDate: today, dueDate: d(5) }),
      task({ id: 'c-booth', projectId: 'p-club', title: '부스 물품 발주', estimatedHours: 1, scheduledDate: d(8), dueDate: d(9) }),
      task({ id: 'c-rehearsal', projectId: 'p-club', title: '행사 리허설', estimatedHours: 3, scheduledDate: d(15), dueDate: d(16) }),
      // 알고리즘
      task({ id: 'a-concept', projectId: 'p-algo', title: '개념 정리', estimatedHours: 1 }),
      task({ id: 'a-week', projectId: 'p-algo', title: '이번 주차 문제풀이', estimatedHours: 0.75, dependsOn: 'a-concept', scheduledDate: today, dueDate: d(1) }),
      task({ id: 'a-next', projectId: 'p-algo', title: '다음 주차 문제풀이', estimatedHours: 3, scheduledDate: d(6), dueDate: d(7) }),
      task({ id: 'a-review', projectId: 'p-algo', title: '코드 리뷰', estimatedHours: 1, scheduledDate: d(2), dueDate: d(3) }),
    ],
  };
}

/** 챗봇 목업: Figma의 질문 흐름 (질문 5개 중 앞의 2개는 명세서 확인·첫 질문) */
export const MOCK_CHAT_SCRIPT: { from: 'bot' | 'me'; text: string }[] = [
  { from: 'bot', text: '과제명세서를 읽었어요. 설계 문서, 보고서, 발표가 필요하네요. 몇 가지만 여쭤볼게요.' },
  { from: 'bot', text: '이 과제를 진행하기 위한 선행 지식이 있나요? 예: 인터럽트, UART 통신' },
  { from: 'me', text: 'UART는 아는데 인터럽트는 거의 처음이에요' },
  { from: 'bot', text: '좋아요. 팀원 중 누가 보고서를 맡나요? 내 몫만 일정에 넣을게요.' },
  { from: 'me', text: '보고서랑 발표자료는 제가 해요' },
  { from: 'bot', text: '마지막으로, 하루에 이 과제에 쓸 수 있는 시간은 대략 얼마인가요?' },
];
export const MOCK_CHAT_TOTAL_QUESTIONS = 5;
export const MOCK_CHAT_DONE = '정리됐어요! 인터럽트 선행 학습을 맨 앞에 넣고, 보고서는 설계 문서 뒤로 연결했어요. 4개 작업을 만들었어요.';

/** 챗봇 목업: AI가 제안한 작업 (Figma) */
export const MOCK_PROPOSED_TASKS: DraftTask[] = [
  { key: 'k1', title: '관련 개념 학습 (인터럽트)', estimatedHours: 2, dependsOnKey: null, prerequisite: true },
  { key: 'k2', title: '설계 문서 작성', estimatedHours: 3, dependsOnKey: 'k1', prerequisite: false },
  { key: 'k3', title: '보고서 초안 작성', estimatedHours: 4, dependsOnKey: 'k2', prerequisite: false },
  { key: 'k4', title: '발표자료 제작', estimatedHours: 2, dependsOnKey: null, prerequisite: false },
];
