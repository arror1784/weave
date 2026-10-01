import { fireEvent, screen, waitFor } from '@testing-library/react-native';

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
    await waitFor(() => expect(completionRef.current).toEqual({ projectId: 2, name: '창업동아리' }));
    // 완료 후 일정을 새로 받는다
    await waitFor(() => expect(api.getSchedule).toHaveBeenCalledTimes(2));
  });

  it('고정 일정은 보여주지 않는다 (지금은 입력하지 않기로 함)', async () => {
    await renderWithProviders(<TodayScreen />);
    await screen.findByRole('header', { name: '9월 30일 수요일' });
    expect(screen.queryByText('일정')).toBeNull();
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
