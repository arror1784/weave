import { screen, within } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import OverloadScreen from '@/app/overload';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

beforeEach(() => {
  resetRouterMock();
  // 하루 가용 3시간. 오늘(수) 7.5h = 밀린 작업 4h(설계 문서 작성 3 + 행사 장소 섭외 1) + 오늘 몫 3.5h
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('이번 주 날짜별 과부하', () => {
  it('오늘부터 일요일까지 날마다 그날 소요를 하루 가용 시간과 비교한다', async () => {
    await renderWithProviders(<OverloadScreen />);
    await screen.findByRole('header', { name: '이번 주 과부하' });
    expect(screen.getByText('하루 가용 3h를 넘는 날이 1일 있어요.')).toBeOnTheScreen();
    expect(screen.getByLabelText('오늘 9월 30일 수요일 7.5시간')).toBeOnTheScreen();
    expect(screen.getByLabelText('10월 1일 목요일 1.5시간')).toBeOnTheScreen();
    expect(screen.getByLabelText('10월 4일 일요일 0.67시간')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/10월 5일/)).toBeNull();
    expect(screen.getByText('4.5h 초과')).toBeOnTheScreen();
  });

  it('날마다 그날 할 작업과 그날 드는 시간을 보여주고, 작업이 없는 날은 없다고 알린다', async () => {
    await renderWithProviders(<OverloadScreen />);
    const today = await screen.findByTestId('day-2026-09-30');
    expect(within(today).getByLabelText('설계 문서 작성, 3h, 임베디드시스템 과제')).toBeOnTheScreen();
    expect(within(today).getByLabelText('보고서 v2 초안 작성, 0.5h, 임베디드시스템 과제')).toBeOnTheScreen();
    expect(within(screen.getByTestId('day-2026-10-03')).getByText('할 작업이 없어요.')).toBeOnTheScreen();
  });

  it('작업을 미루는 기능은 없다', async () => {
    await renderWithProviders(<OverloadScreen />);
    await screen.findByRole('header', { name: '이번 주 과부하' });
    expect(screen.queryByText('미루기')).toBeNull();
    expect(screen.queryByRole('button', { name: '일정에 반영하기' })).toBeNull();
  });

  it('모든 날이 하루 가용 시간 안이면 여유 있다고 알려준다', async () => {
    api.getSchedule.mockResolvedValue({ ...sampleSchedule(TEST_TODAY), dailyAvailableHours: 8 });
    await renderWithProviders(<OverloadScreen />);
    expect(await screen.findByRole('header', { name: '이번 주는 여유가 있어요' })).toBeOnTheScreen();
    expect(screen.queryByText(/초과/)).toBeNull();
  });
});
