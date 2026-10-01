import { fireEvent, screen, within } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import ScheduleScreen from '@/app/(tabs)/schedule';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

beforeEach(() => {
  resetRouterMock();
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('전체 일정', () => {
  it('기본은 주간 타임라인: 이번 주 월~일을 날짜별로 보여준다', async () => {
    await renderWithProviders(<ScheduleScreen />);
    await screen.findByText('9/28 – 10/4');
    expect(screen.getByRole('tab', { name: '주간 타임라인' })).toBeSelected();
    expect(screen.getByText('9/28 – 10/4')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^9월 30일 수요일/)).toBeOnTheScreen();
  });

  it('하루 가용 시간을 넘는 날은 초과 시간을 경고한다', async () => {
    await renderWithProviders(<ScheduleScreen />);
    await screen.findByText('9/28 – 10/4');
    // 오늘(9/30) 하루 몫: 보고서 0.5(3일) + 리뷰 1(2일) + 문제풀이 0.75 + 제안서 1.25 = 3.5h > 3h
    expect(screen.getByText('0.5h 초과')).toBeOnTheScreen();
  });

  it('월간 캘린더로 바꾸고 날짜를 누르면 그날 항목을 하단 시트로 보여준다', async () => {
    await renderWithProviders(<ScheduleScreen />);
    await screen.findByText('9/28 – 10/4');
    await fireEvent.press(screen.getByRole('tab', { name: '월간 캘린더' }));
    await fireEvent.press(screen.getByRole('button', { name: /^9월 30일/ }));
    const sheet = screen.getByLabelText('9월 30일 일정');
    expect(within(sheet).getByText('설계 문서 리뷰 반영')).toBeOnTheScreen();
    expect(within(sheet).getByText('3.5h / 3h')).toBeOnTheScreen();
  });

  it('월간 캘린더는 한 줄에 월~일 7칸씩 주 단위로 나눈다 (2026-09-06은 일요일 칸)', async () => {
    await renderWithProviders(<ScheduleScreen />);
    await screen.findByText('9/28 – 10/4');
    await fireEvent.press(screen.getByRole('tab', { name: '월간 캘린더' }));
    const weeks = screen.getAllByTestId('month-week');
    expect(weeks).toHaveLength(5);
    const firstWeekDays = within(weeks[0]).getAllByRole('button').map((b) => b.props.accessibilityLabel.split(',')[0]);
    expect(firstWeekDays.at(-1)).toBe('9월 6일 일요일');
  });

  it('프로젝트 범례를 보여준다', async () => {
    await renderWithProviders(<ScheduleScreen />);
    await screen.findByText('9/28 – 10/4');
    for (const name of ['임베디드시스템 과제', '창업동아리', '알고리즘 스터디']) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
  });
});
