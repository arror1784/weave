import { act, fireEvent, screen } from '@testing-library/react-native';

import ChatScreen from '@/app/project/new/chat';
import NewProjectScreen from '@/app/project/new/index';
import ReviewScreen from '@/app/project/new/review';
import { MOCK_PROPOSED_TASKS } from '@/mocks/seed';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

const draft = { name: '임베디드시스템 과제', description: '', deadline: '2026-10-09', tasks: [] };

describe('등록 1/3 기본 정보', () => {
  it('단계 표시와 입력칸을 보여준다', async () => {
    await renderWithStore(<NewProjectScreen />);
    expect(screen.getByText('1 / 3')).toBeOnTheScreen();
    for (const label of ['프로젝트명', '마감일', '설명 · 목표']) expect(screen.getByLabelText(label)).toBeOnTheScreen();
  });

  it('프로젝트명이 없거나 마감일 형식이 틀리면 다음으로 가지 않는다', async () => {
    await renderWithStore(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('마감일'), '10월 9일');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('프로젝트명을 입력해 주세요.')).toBeOnTheScreen();
    expect(screen.getByText('2026-10-09처럼 입력해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('마감일을 입력하면 D-day를 보여주고, 다음을 누르면 초안을 만들고 챗봇으로 간다', async () => {
    await renderWithStore(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '임베디드시스템 과제');
    await fireEvent.changeText(screen.getByLabelText('마감일'), '2026-10-09');
    expect(screen.getByText('D-9')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('설명 · 목표'), '3인 팀플');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(storeRef.current?.draft).toMatchObject({ name: '임베디드시스템 과제', deadline: '2026-10-09', description: '3인 팀플' });
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/chat');
  });

  it('참고자료 첨부는 아직 준비 중임을 알린다 (목업)', async () => {
    await renderWithStore(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'URL 첨부' }));
    expect(screen.getByText('첨부는 아직 준비 중이에요')).toBeOnTheScreen();
  });
});

/** 메시지 타이머는 화면이 다시 그려진 뒤 다음 것이 걸리므로, 1초씩 여러 번 흘려보낸다 */
async function playScript() {
  for (let i = 0; i < 8; i++) await act(async () => jest.advanceTimersByTime(1000));
}

describe('등록 2/3 AI 챗봇 (목업)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('대화가 차례로 나타나고, 마지막 질문에 답하면 작업을 제안하고 검토로 갈 수 있다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    expect(screen.getByText(/과제명세서를 읽었어요/)).toBeOnTheScreen();
    await playScript();
    expect(screen.getByText(/하루에 이 과제에 쓸 수 있는 시간/)).toBeOnTheScreen();
    expect(screen.getByText('4/5')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('답변 입력'), '하루 2시간 정도요');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(screen.getByText('5/5')).toBeOnTheScreen();
    expect(screen.getByText(/4개 작업을 만들었어요/)).toBeOnTheScreen();
    expect(storeRef.current?.draft?.tasks).toHaveLength(4);

    await fireEvent.press(screen.getByRole('button', { name: '작업 검토하기' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/review');
  });

  it('빈 답변은 보낼 수 없다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    await playScript();
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
  });
});

describe('등록 3/3 작업 검토', () => {
  const withTasks = { ...draft, tasks: MOCK_PROPOSED_TASKS };

  it('제안된 작업 수와 총 시간, 선행 학습·선행 연결을 보여준다', async () => {
    await renderWithStore(<ReviewScreen />, { draft: withTasks });
    expect(screen.getByText('4개')).toBeOnTheScreen();
    expect(screen.getByText('총 11h')).toBeOnTheScreen();
    expect(screen.getByText('선행 학습')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '선행 연결 해제: 관련 개념 학습 완료 후' })).toBeOnTheScreen();
  });

  it('이름·시간을 고치고, 삭제·추가하고, 선행 연결을 토글한다', async () => {
    await renderWithStore(<ReviewScreen />, { draft: withTasks });
    await fireEvent.changeText(screen.getByLabelText('1번 작업 이름'), '인터럽트 개념 학습');
    await fireEvent.press(screen.getByRole('button', { name: '1번 작업 시간 늘리기' }));
    await fireEvent.press(screen.getByRole('button', { name: '4번 작업 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '작업 직접 추가' }));
    await fireEvent.press(screen.getByRole('button', { name: '선행 연결: 보고서 초안 작성 완료 후' }));
    const tasks = storeRef.current!.draft!.tasks;
    expect(tasks.map((t) => [t.title, t.estimatedHours])).toEqual([
      ['인터럽트 개념 학습', 2.5],
      ['설계 문서 작성', 3],
      ['보고서 초안 작성', 4],
      ['새 작업', 1],
    ]);
    expect(tasks[3].dependsOnKey).toBe('k3');
  });

  it('등록 완료하면 프로젝트를 만들고 알림 후 상세로 간다', async () => {
    await renderWithStore(<ReviewScreen />, { draft: withTasks });
    await fireEvent.press(screen.getByRole('button', { name: '등록 완료' }));
    const created = storeRef.current!.projects.at(-1)!;
    expect(created.name).toBe('임베디드시스템 과제');
    expect(storeRef.current!.draft).toBeNull();
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(`/projects/${created.id}`);
    expect(screen.getByText('임베디드시스템 과제가 등록됐어요')).toBeOnTheScreen();
  });
});
