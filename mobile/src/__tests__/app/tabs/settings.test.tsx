import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import * as authApi from '@/api/auth';
import * as projectsApi from '@/api/projects';
import SettingsScreen from '@/app/(tabs)/settings';
import WidgetsScreen from '@/app/widgets';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY, testAuth } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/auth');
jest.mock('@/api/projects');
const auth = jest.mocked(authApi);
const projects = jest.mocked(projectsApi);

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  auth.getMe.mockResolvedValue({ id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 2, standingSessionHours: 1 });
  projects.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('설정', () => {
  it('서버에서 받은 계정 이메일을 보여준다', async () => {
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('me@example.com')).toBeOnTheScreen();
  });

  it('하루 가용 시간(서버 값 3시간)을 옮기고 손을 떼면 서버에 저장한다', async () => {
    auth.updateSettings.mockResolvedValueOnce({ id: 1, email: 'me@example.com', dailyAvailableHours: 4.5, standingSessionsPerWeek: 2, standingSessionHours: 1 });
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('3시간')).toBeOnTheScreen();
    const slider = screen.getByLabelText('하루 가용 시간');
    await act(async () => slider.props.onValueChange(4.5));
    expect(screen.getByText('4.5시간')).toBeOnTheScreen();
    expect(auth.updateSettings).not.toHaveBeenCalled();
    await act(async () => slider.props.onSlidingComplete(4.5));
    expect(auth.updateSettings).toHaveBeenCalledWith({ dailyAvailableHours: 4.5 });
  });

  it('상시 프로젝트 칸(서버 값 주 2번 × 1시간)을 보여주고, 바꾸면 그 값만 서버에 저장한다 (사용자 결정 2026-10-17)', async () => {
    auth.updateSettings.mockResolvedValue({ id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 3, standingSessionHours: 1 });
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('주 2번')).toBeOnTheScreen();
    expect(screen.getByText('1시간')).toBeOnTheScreen();

    const perWeek = screen.getByLabelText('상시 프로젝트 주 횟수');
    expect(perWeek.props.minimumValue).toBe(0);
    expect(perWeek.props.maximumValue).toBe(7);
    await act(async () => perWeek.props.onValueChange(3));
    expect(screen.getByText('주 3번')).toBeOnTheScreen();
    await act(async () => perWeek.props.onSlidingComplete(3));
    expect(auth.updateSettings).toHaveBeenLastCalledWith({ standingSessionsPerWeek: 3 });

    // 한 번에 0.5시간~하루 가용 시간(3시간)
    const hours = screen.getByLabelText('상시 프로젝트 한 번 시간');
    expect(hours.props.minimumValue).toBe(0.5);
    expect(hours.props.maximumValue).toBe(3);
    await act(async () => hours.props.onSlidingComplete(1.5));
    expect(auth.updateSettings).toHaveBeenLastCalledWith({ standingSessionHours: 1.5 });
  });

  it('주 0번이면 상시 작업을 배치하지 않는다고 알려준다', async () => {
    auth.getMe.mockResolvedValue({ id: 1, email: 'me@example.com', dailyAvailableHours: 3, standingSessionsPerWeek: 0, standingSessionHours: 1 });
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('안 함')).toBeOnTheScreen();
    expect(screen.getByText(/마감 없는 프로젝트의 작업은 배치하지 않아요/)).toBeOnTheScreen();
  });

  it('작업 다시 배치: 확인을 받은 뒤 서버에 다시 배치를 요청하고 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    projects.replanSchedule.mockResolvedValueOnce(sampleSchedule(TEST_TODAY));
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '작업 다시 배치' }));
    expect(projects.replanSchedule).not.toHaveBeenCalled();
    await act(async () => alert.mock.calls.at(-1)![2]!.find((b) => b.text === '다시 배치')!.onPress!());
    expect(projects.replanSchedule).toHaveBeenCalled();
    expect(await screen.findByText('작업을 다시 배치했어요')).toBeOnTheScreen();
  });

  it('홈 화면 위젯 미리보기로 간다', async () => {
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '홈 화면 위젯' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/widgets');
  });

  it('로그아웃하면 서버 로그아웃과 기기 데이터 정리를 맡긴다', async () => {
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(testAuth.signOut).toHaveBeenCalled();
  });

  it('계정 삭제는 확인을 받은 뒤에 서버에 요청한다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '계정 삭제' }));
    expect(testAuth.deleteAccount).not.toHaveBeenCalled();
    await act(async () => alert.mock.calls[0][2]!.find((b) => b.style === 'destructive')!.onPress!());
    await waitFor(() => expect(testAuth.deleteAccount).toHaveBeenCalled());
  });
});

describe('홈 화면 위젯 미리보기', () => {
  it('소형(남은 개수·가장 급한 일)과 중형(오늘 작업 목록·과부하)을 서버 일정으로 보여준다', async () => {
    await renderWithProviders(<WidgetsScreen />);
    expect(await screen.findByText('소형 2×2')).toBeOnTheScreen();
    expect(screen.getByText('중형 4×2')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^오늘 6개 남음, 가장 급한 일 행사 장소 섭외/)).toBeOnTheScreen();
    expect(screen.getByText('과부하 7.5h / 3h')).toBeOnTheScreen();
  });
});
