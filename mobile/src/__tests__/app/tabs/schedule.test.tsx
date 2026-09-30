import { screen } from '@testing-library/react-native';

import ScheduleScreen from '@/app/(tabs)/schedule';
import { resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('전체 일정 관리 화면', () => {
  it('모든 프로젝트의 작업을 밀린 작업 → 날짜순으로 묶어 보여준다', async () => {
    await renderWithStore(<ScheduleScreen />);
    const headers = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headers).toEqual(['전체 일정', '밀린 작업', '오늘 · 9월 30일 수요일', '10월 1일 목요일', '10월 2일 금요일', '10월 4일 일요일', '10월 7일 수요일']);
  });

  it('작업마다 프로젝트 이름을 함께 보여준다', async () => {
    await renderWithStore(<ScheduleScreen />);
    expect(screen.getByRole('checkbox', { name: '부품 구매 완료' })).toBeOnTheScreen();
    expect(screen.getAllByText('임베디드 팀프로젝트').length).toBeGreaterThan(0);
  });
});
