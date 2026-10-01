import { screen } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import OverloadScreen from '@/app/overload';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

beforeEach(() => {
  resetRouterMock();
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('이번 주 과부하', () => {
  // 오늘(수)~일 5일. 밀린 작업 4h + 남은 작업 몫 ≈ 7.17h = 11.17h
  const lowCapacity = () => api.getSchedule.mockResolvedValue({ ...sampleSchedule(TEST_TODAY), dailyAvailableHours: 2 });

  it('예상 소요가 이번 주 가용 시간(하루 가용 × 남은 날)을 넘으면 초과 시간을 알려준다', async () => {
    lowCapacity();
    await renderWithProviders(<OverloadScreen />);
    await screen.findByText('이번 주 작업');
    expect(screen.getByRole('header', { name: '이번 주 과부하' })).toBeOnTheScreen();
    expect(screen.getByLabelText('예상 소요 11.17시간')).toBeOnTheScreen();
    expect(screen.getByLabelText('가용 시간 10시간')).toBeOnTheScreen();
    expect(screen.getByText('1.17시간이 초과됐어요.')).toBeOnTheScreen();
  });

  it('이번 주 작업을 시간 큰 순으로 보여주고, 작업을 미루는 기능은 없다', async () => {
    lowCapacity();
    await renderWithProviders(<OverloadScreen />);
    await screen.findByText('이번 주 작업');
    expect(screen.getByLabelText(/^설계 문서 작성, 3h/)).toBeOnTheScreen();
    expect(screen.queryByText('미루기')).toBeNull();
    expect(screen.queryByRole('button', { name: '일정에 반영하기' })).toBeNull();
  });

  it('가용 시간 안이면 여유 있다고 알려준다', async () => {
    await renderWithProviders(<OverloadScreen />);
    await screen.findByText('이번 주 작업');
    expect(screen.getByRole('header', { name: '이번 주는 여유가 있어요' })).toBeOnTheScreen();
  });
});
