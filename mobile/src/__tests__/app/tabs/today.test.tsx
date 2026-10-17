import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import TodayScreen from '@/app/(tabs)/index';
import { sampleSchedule } from '@/test-utils/fixtures';
import { completionRef, renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('오늘의 일정', () => {
  it('서버 일정으로 날짜 제목과 남은 일 개수를 보여준다', async () => {
    await renderWithProviders(<TodayScreen />);
    expect(await screen.findByRole('header', { name: '9월 30일 수요일' })).toBeOnTheScreen();
    expect(screen.getByText(/6개의 일이 남았어요/)).toBeOnTheScreen();
  });

  it('오늘 부하(밀린 작업 전부 + 오늘 몫)가 하루 가용 시간을 넘으면 과부하 카드, 누르면 이번 주 과부하로 간다', async () => {
    await renderWithProviders(<TodayScreen />);
    // 밀림 4h(설계 3 + 장소 1) + 오늘 몫 3.5h = 7.5h > 3h
    await fireEvent.press(await screen.findByRole('button', { name: /과부하, 7.5시간 \/ 가용 3시간/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/overload');
  });

  it('오늘 작업을 다 끝내도 오늘 작업량 카드(완료 시간 포함)는 남는다 (사용자 결정 2026-10-01)', async () => {
    const s = sampleSchedule(TEST_TODAY);
    api.getSchedule.mockResolvedValue({ ...s, tasks: s.tasks.map((t) => ({ ...t, done: true })) });
    await renderWithProviders(<TodayScreen />);
    // 오늘 몫 3.5h를 모두 끝냄 — 총량이 가용 3h를 넘어 과부하 표시는 그대로
    expect(await screen.findByRole('button', { name: /과부하, 3.5시간 \/ 가용 3시간, 완료 3.5시간/ })).toBeOnTheScreen();
    expect(screen.getByText(/완료 3.5h/)).toBeOnTheScreen();
  });

  it('가용 시간 안이면 과부하 대신 오늘 작업량을 보여준다', async () => {
    api.getSchedule.mockResolvedValue({ ...sampleSchedule(TEST_TODAY), dailyAvailableHours: 8 });
    await renderWithProviders(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^오늘 작업, 7.5시간 \/ 가용 8시간, 완료 0시간/ }));
    expect(screen.queryByText('과부하')).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/overload');
  });

  it('작업 카드: 프로젝트 배지·지연 표시·D-day·소요 시간·선행 미완료 경고', async () => {
    await renderWithProviders(<TodayScreen />);
    expect(await screen.findAllByText('지연')).toHaveLength(2);
    expect(screen.getByText('D+2')).toBeOnTheScreen();
    expect(screen.getByText('45분')).toBeOnTheScreen();
    expect(screen.getByText('개념 정리 미완료')).toBeOnTheScreen();
  });

  it('체크하면 서버에 완료로 보내고, 그 프로젝트의 마지막 작업이면 완료 여부를 묻는다', async () => {
    const done = { ...sampleSchedule(TEST_TODAY).tasks.find((t) => t.id === 202)!, done: true };
    api.setTaskDone.mockResolvedValueOnce({ task: done, projectAllDone: true });
    await renderWithProviders(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: '후원사 제안서 수정 완료' }));
    expect(api.setTaskDone).toHaveBeenCalledWith(202, true);
    await waitFor(() => expect(completionRef.current).toEqual({ projectId: 2, name: '창업동아리', taskId: 202 }));
    // 완료 후 일정을 새로 받는다
    await waitFor(() => expect(api.getSchedule).toHaveBeenCalledTimes(2));
  });

  it('체크가 실패하면 체크를 되돌리고 오류 알림을 띄운다 (사용자 결정 2026-10-17)', async () => {
    api.setTaskDone.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', '작업을 찾을 수 없어요.'));
    await renderWithProviders(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: '후원사 제안서 수정 완료' }));
    expect(await screen.findByText('작업을 찾을 수 없어요.')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: '후원사 제안서 수정 완료' })).not.toBeChecked();
  });

  it('오늘 개인 일정을 시각 순으로 보여준다 (사용자 결정 2026-10-17 — 개인 일정을 입력하고 보여주기로 바뀜)', async () => {
    api.getSchedule.mockResolvedValue({
      ...sampleSchedule(TEST_TODAY),
      events: [
        { eventId: 2, date: TEST_TODAY, title: '동아리 모임', startTime: '18:00', endTime: '21:00' },
        { eventId: 1, date: TEST_TODAY, title: '운영체제 수업', startTime: '10:00', endTime: '12:00' },
        { eventId: 1, date: '2026-10-05', title: '운영체제 수업', startTime: '10:00', endTime: '12:00' },
      ],
    });
    await renderWithProviders(<TodayScreen />);
    const section = await screen.findByLabelText('오늘 일정');
    expect(within(section).getAllByText(/~/).map((n) => n.props.children)).toEqual(['10:00~12:00', '18:00~21:00']);
    expect(within(section).getByText('운영체제 수업')).toBeOnTheScreen();
  });

  it('오늘 개인 일정이 없으면 그 칸을 보여주지 않는다', async () => {
    await renderWithProviders(<TodayScreen />);
    await screen.findByRole('header', { name: '9월 30일 수요일' });
    expect(screen.queryByLabelText('오늘 일정')).toBeNull();
  });

  it('떠 있는 + 버튼으로 새 프로젝트를 등록한다', async () => {
    await renderWithProviders(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '새 프로젝트 등록' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });

  it('할 일이 없으면 빈 상태 안내를 보여준다', async () => {
    api.getSchedule.mockResolvedValue({ ...sampleSchedule(TEST_TODAY), tasks: [] });
    await renderWithProviders(<TodayScreen />);
    expect(await screen.findByText('오늘 예정된 작업이 없어요.')).toBeOnTheScreen();
    expect(screen.queryByText(/과부하/)).toBeNull();
  });

  it('불러오지 못하면 오류와 다시 시도를 보여주고, 다시 시도하면 다시 부른다', async () => {
    api.getSchedule.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', '잠시 후 다시 시도해 주세요.'));
    await renderWithProviders(<TodayScreen />);
    expect(await screen.findByText('잠시 후 다시 시도해 주세요.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('header', { name: '9월 30일 수요일' })).toBeOnTheScreen();
  });
});
