import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { User } from '@/api/types';
import AvailabilityScreen from '@/app/availability';
import StandingScreen from '@/app/standing';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/auth');
jest.mock('@/api/projects');
const auth = jest.mocked(authApi);
const projects = jest.mocked(projectsApi);

const me = (over: Partial<User> = {}): User => ({
  id: 1, email: 'me@example.com', dailyAvailableHours: 3, weeklyAvailableHours: [3, 3, 3, 3, 3, 3, 3], holidayAvailableHours: 3,
  standingSessionsPerWeek: 2, standingSessionHours: 1, ...over,
});

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  projects.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

/** 슬라이더를 끌었다 놓는다(목 슬라이더 — jest.setup.tsx) */
async function slide(label: string, value: number) {
  const slider = screen.getByLabelText(label);
  await act(async () => slider.props.onValueChange(value));
  await act(async () => slider.props.onSlidingComplete?.(value));
}

/**
 * 설정 → 요일별 가용 시간(사용자 결정 2026-10-22) — −/+ 버튼 대신 슬라이더, 움직여도 서버에 바로 보내지 않고 '저장'을 눌러야 한 번에 보낸다
 * (누를 때마다 저장·다시 배치해서 느렸고, 숫자 폭이 바뀌어 버튼이 밀렸다).
 */
describe('요일별 가용 시간', () => {
  it('월~일·공휴일 8줄을 서버 값으로 보여준다 — 0~24시간, 0.5 단위, 0시간은 "쉼"', async () => {
    auth.getMe.mockResolvedValue(me({ weeklyAvailableHours: [3, 1.5, 3, 3, 2, 5, 0], holidayAvailableHours: 5 }));
    await renderWithProviders(<AvailabilityScreen />);
    await waitFor(() => expect(screen.getByLabelText('화요일 가용 시간').props.value).toBe(1.5));
    for (const day of ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일', '공휴일']) {
      const slider = screen.getByLabelText(`${day} 가용 시간`);
      expect(slider.props.minimumValue).toBe(0);
      expect(slider.props.maximumValue).toBe(24);
      expect(slider.props.step).toBe(0.5);
    }
    expect(within(screen.getByTestId('hours-화요일')).getByText('1.5시간')).toBeOnTheScreen();
    expect(within(screen.getByTestId('hours-일요일')).getByText('쉼')).toBeOnTheScreen();
  });

  it('움직이는 동안은 화면에만 바뀌고, 저장을 눌러야 바뀐 값만 한 번에 보낸 뒤 설정으로 돌아간다', async () => {
    auth.getMe.mockResolvedValue(me());
    auth.updateSettings.mockResolvedValue(me({ weeklyAvailableHours: [3, 4.5, 3, 3, 3, 3, 3], holidayAvailableHours: 0 }));
    await renderWithProviders(<AvailabilityScreen />);
    const save = await screen.findByRole('button', { name: '저장' });
    expect(save).toBeDisabled(); // 바꾼 게 없으면 저장할 것도 없다

    await slide('화요일 가용 시간', 4.5);
    await slide('공휴일 가용 시간', 0);
    expect(within(screen.getByTestId('hours-화요일')).getByText('4.5시간')).toBeOnTheScreen();
    expect(auth.updateSettings).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(auth.updateSettings).toHaveBeenCalledTimes(1);
    expect(auth.updateSettings).toHaveBeenCalledWith({ weeklyAvailableHours: [3, 4.5, 3, 3, 3, 3, 3], holidayAvailableHours: 0 });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('공휴일만 바꾸면 공휴일만 보낸다', async () => {
    auth.getMe.mockResolvedValue(me());
    auth.updateSettings.mockResolvedValue(me({ holidayAvailableHours: 6 }));
    await renderWithProviders(<AvailabilityScreen />);
    await screen.findByRole('button', { name: '저장' });
    await slide('공휴일 가용 시간', 6);
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(auth.updateSettings).toHaveBeenCalledWith({ holidayAvailableHours: 6 });
  });

  it('서버가 거절하면 이유를 보여주고 화면에 남는다(바꾼 값도 그대로)', async () => {
    auth.getMe.mockResolvedValue(me());
    auth.updateSettings.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', '0.5시간 단위로 정해 주세요.'));
    await renderWithProviders(<AvailabilityScreen />);
    await screen.findByRole('button', { name: '저장' });
    await slide('월요일 가용 시간', 5);
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('0.5시간 단위로 정해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('hours-월요일')).getByText('5시간')).toBeOnTheScreen();
  });
});

/** 설정 → 상시 프로젝트 시간(사용자 결정 2026-10-22) — 요일별 가용 시간처럼 별도 화면 + 저장 버튼 */
describe('상시 프로젝트 시간', () => {
  it('주 1~7번, 한 번에 0.5시간~가장 긴 요일(공휴일 포함)의 가용 시간을 서버 값으로 보여준다', async () => {
    auth.getMe.mockResolvedValue(me({ weeklyAvailableHours: [3, 3, 3, 3, 3, 4, 4], holidayAvailableHours: 2 }));
    await renderWithProviders(<StandingScreen />);
    await waitFor(() => expect(screen.getByLabelText('상시 프로젝트 한 번 시간').props.maximumValue).toBe(4));
    const perWeek = screen.getByLabelText('상시 프로젝트 주 횟수');
    expect(perWeek.props.minimumValue).toBe(1); // 주 0번은 막는다(사용자 결정 2026-10-18)
    expect(perWeek.props.maximumValue).toBe(7);
    expect(screen.getByLabelText('상시 프로젝트 한 번 시간').props.minimumValue).toBe(0.5);
    expect(screen.getByText('주 2번')).toBeOnTheScreen();
    expect(screen.getByText('1시간')).toBeOnTheScreen();
  });

  it('바꾼 값만 저장을 눌렀을 때 한 번에 보낸다', async () => {
    auth.getMe.mockResolvedValue(me({ weeklyAvailableHours: [3, 3, 3, 3, 3, 4, 4] }));
    auth.updateSettings.mockResolvedValue(me({ weeklyAvailableHours: [3, 3, 3, 3, 3, 4, 4], standingSessionsPerWeek: 3, standingSessionHours: 1.5 }));
    await renderWithProviders(<StandingScreen />);
    await waitFor(() => expect(screen.getByLabelText('상시 프로젝트 한 번 시간').props.maximumValue).toBe(4));
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    await slide('상시 프로젝트 주 횟수', 3);
    await slide('상시 프로젝트 한 번 시간', 1.5);
    expect(screen.getByText('주 3번')).toBeOnTheScreen();
    expect(auth.updateSettings).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(auth.updateSettings).toHaveBeenCalledTimes(1);
    expect(auth.updateSettings).toHaveBeenCalledWith({ standingSessionsPerWeek: 3, standingSessionHours: 1.5 });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });
});
