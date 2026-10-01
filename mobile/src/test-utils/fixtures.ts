import type { Project, Schedule, Task } from '@/api/types';
import { addDays, type DateKey } from '@/lib/date';

// 테스트용 서버 응답 — Figma(Weave Make 디자인) 예시를 API 모양으로 옮겼다. 날짜는 today 기준 상대값.

export function sampleSchedule(today: DateKey): Schedule {
  const d = (n: number) => addDays(today, n);
  const task = (t: Partial<Task> & Pick<Task, 'id' | 'projectId' | 'title'>): Task => ({
    estimatedHours: 1,
    dependsOnId: null,
    scheduledDate: null,
    spanDays: 1,
    dueDate: null,
    done: false,
    prerequisite: false,
    ...t,
  });
  const projects: Project[] = [
    { id: 1, name: '임베디드시스템 과제', description: 'STM32 센서 수집 시스템 설계 — 설계 문서, 보고서, 발표까지', deadline: d(9), status: 'active', color: 'teal' },
    { id: 2, name: '창업동아리', description: '가을 창업 행사 준비', deadline: d(17), status: 'active', color: 'magenta' },
    { id: 3, name: '알고리즘 스터디', description: '매주 화요일 문제풀이', deadline: null, status: 'active', color: 'violet' },
  ];
  const tasks: Task[] = [
    task({ id: 101, projectId: 1, title: '개념 학습 (인터럽트)', estimatedHours: 2, scheduledDate: d(-3), spanDays: 2, dueDate: d(-2), done: true, prerequisite: true }),
    task({ id: 102, projectId: 1, title: '설계 문서 작성', estimatedHours: 3, dependsOnId: 101, scheduledDate: d(-1), dueDate: d(-1) }),
    task({ id: 103, projectId: 1, title: '보고서 v2 초안 작성', estimatedHours: 1.5, dependsOnId: 102, scheduledDate: today, spanDays: 3, dueDate: d(2) }),
    task({ id: 104, projectId: 1, title: '설계 문서 리뷰 반영', estimatedHours: 2, scheduledDate: today, spanDays: 2, dueDate: d(3) }),
    task({ id: 105, projectId: 1, title: '발표자료 제작', estimatedHours: 2, scheduledDate: d(4), spanDays: 3, dueDate: d(8) }),
    task({ id: 201, projectId: 2, title: '행사 장소 섭외', estimatedHours: 1, scheduledDate: d(-2), dueDate: d(-2) }),
    task({ id: 202, projectId: 2, title: '후원사 제안서 수정', estimatedHours: 1.25, scheduledDate: today, dueDate: d(5) }),
    task({ id: 203, projectId: 2, title: '부스 물품 발주', estimatedHours: 1, scheduledDate: d(8), dueDate: d(9) }),
    task({ id: 204, projectId: 2, title: '행사 리허설', estimatedHours: 3, scheduledDate: d(15), dueDate: d(16) }),
    task({ id: 301, projectId: 3, title: '개념 정리', estimatedHours: 1 }),
    task({ id: 302, projectId: 3, title: '이번 주차 문제풀이', estimatedHours: 0.75, dependsOnId: 301, scheduledDate: today, dueDate: d(1) }),
    task({ id: 303, projectId: 3, title: '다음 주차 문제풀이', estimatedHours: 3, scheduledDate: d(6), dueDate: d(7) }),
    task({ id: 304, projectId: 3, title: '코드 리뷰', estimatedHours: 1, scheduledDate: d(2), dueDate: d(3) }),
  ];
  return { today, dailyAvailableHours: 3, projects, tasks };
}
