import { fireEvent, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('오늘의 일정', () => {
  it('날짜 제목과 남은 일 개수를 보여준다', async () => {
    await renderWithStore(<TodayScreen />);
    expect(screen.getByRole('header', { name: '9월 30일 수요일' })).toBeOnTheScreen();
    expect(screen.getByText(/6개의 일이 남았어요/)).toBeOnTheScreen();
  });

  it('오늘 부하가 하루 가용 시간을 넘으면 과부하 카드를 보여주고, 누르면 이번 주 과부하로 간다', async () => {
    await renderWithStore(<TodayScreen />);
    const card = screen.getByRole('button', { name: /과부하, 7.5시간 \/ 가용 3시간/ });
    await fireEvent.press(card);
    expect(mockRouter.push).toHaveBeenCalledWith('/overload');
  });

  it('작업 카드: 프로젝트 배지·지연 표시·D-day·소요 시간·선행 미완료 경고', async () => {
    await renderWithStore(<TodayScreen />);
    expect(screen.getAllByText('지연')).toHaveLength(2);
    expect(screen.getByText('D+2')).toBeOnTheScreen();
    expect(screen.getByText('45분')).toBeOnTheScreen();
    expect(screen.getByText('개념 정리 미완료')).toBeOnTheScreen();
    expect(screen.getAllByText('알고리즘 스터디').length).toBeGreaterThan(0);
  });

  it('체크하면 완료되고 남은 개수가 줄어든다', async () => {
    await renderWithStore(<TodayScreen />);
    await fireEvent.press(screen.getByRole('checkbox', { name: '후원사 제안서 수정 완료' }));
    expect(screen.getByRole('checkbox', { name: '후원사 제안서 수정 완료' })).toBeChecked();
    expect(screen.getByText(/5개의 일이 남았어요/)).toBeOnTheScreen();
  });

  it('고정 일정은 보여주지 않는다 (지금은 입력하지 않기로 함)', async () => {
    await renderWithStore(<TodayScreen />);
    expect(screen.queryByText('일정')).toBeNull();
  });

  it('떠 있는 + 버튼으로 새 프로젝트를 등록한다', async () => {
    await renderWithStore(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '새 프로젝트 등록' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });

  it('할 일이 없으면 빈 상태 안내를 보여준다', async () => {
    await renderWithStore(<TodayScreen />, { tasks: [] });
    expect(screen.getByText('오늘 예정된 작업이 없어요.')).toBeOnTheScreen();
    expect(screen.queryByText(/과부하/)).toBeNull();
  });
});
