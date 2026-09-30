import { addDays, type DateKey } from '@/lib/date';

import type { State } from './types';

/**
 * ⚠ UI 확인용 예시 데이터. 작업 이름은 사용자의 UI 초안(손그림)에서 가져왔다.
 * 날짜는 오늘 기준 상대값이라 언제 실행해도 "밀린 작업·오늘 할 일"이 보인다.
 */
export function createSeed(today: DateKey): Pick<State, 'projects' | 'tasks'> {
  return {
    projects: [
      { id: 'p-hackathon', name: '해커톤 준비', description: '', deadline: addDays(today, 20) },
      { id: 'p-study', name: '스터디', description: '', deadline: null },
      { id: 'p-club', name: '동아리 프로젝트', description: '', deadline: addDays(today, 30) },
      { id: 'p-clubroom', name: '동아리 운영', description: '', deadline: null },
      { id: 'p-embedded', name: '임베디드 팀프로젝트', description: '팀원 4명, 정해진 주제 없음', deadline: null },
    ],
    tasks: [
      { id: 't-venue', projectId: 'p-hackathon', title: '해커톤 장소 섭외', estimatedHours: 3, dependsOn: [], scheduledDate: addDays(today, -5), done: false },
      { id: 't-study3', projectId: 'p-study', title: '3차시 스터디 진행', estimatedHours: 2, dependsOn: [], scheduledDate: today, done: true },
      { id: 't-research', projectId: 'p-club', title: '동아리 프로젝트 기획 자료조사', estimatedHours: 2, dependsOn: [], scheduledDate: today, done: false },
      { id: 't-clean', projectId: 'p-clubroom', title: '동아리방 청소', estimatedHours: 1, dependsOn: [], scheduledDate: today, done: false },
      { id: 't-topic', projectId: 'p-embedded', title: '주제 선정', estimatedHours: null, dependsOn: [], scheduledDate: addDays(today, 1), done: false },
      { id: 't-idea', projectId: 'p-embedded', title: '아이디어 선정', estimatedHours: null, dependsOn: ['t-topic'], scheduledDate: addDays(today, 2), done: false },
      { id: 't-parts', projectId: 'p-embedded', title: '부품 구매', estimatedHours: null, dependsOn: ['t-idea'], scheduledDate: addDays(today, 4), done: false },
      { id: 't-firmware', projectId: 'p-embedded', title: '펌웨어 개발', estimatedHours: null, dependsOn: ['t-parts'], scheduledDate: addDays(today, 7), done: false },
    ],
  };
}

/** 챗봇 목업: UI 초안의 질문 순서 */
export const MOCK_CHAT_QUESTIONS = ['어떤 프로젝트인가요?', '팀원은 몇 명인가요?', '정해진 주제가 있어?'];

/** 챗봇 목업: UI 초안의 "제안된 세부 작업 단계" */
export const MOCK_PROPOSED_TASKS = [
  { title: '주제 선정', estimatedHours: null },
  { title: '아이디어 선정', estimatedHours: null },
  { title: '부품 구매', estimatedHours: null },
  { title: '펌웨어 개발', estimatedHours: null },
];
