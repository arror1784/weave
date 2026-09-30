import { fireEvent, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('오늘의 일정 화면', () => {
  it('오늘 날짜를 제목으로 보여준다', async () => {
    await renderWithStore(<TodayScreen />);
    expect(screen.getByRole('header', { name: '9월 30일 수요일' })).toBeOnTheScreen();
  });

  it('밀린 작업을 지연 일수(D+n)와 함께 보여준다', async () => {
    await renderWithStore(<TodayScreen />);
    expect(screen.getByRole('header', { name: '밀린 작업 1건' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: '해커톤 장소 섭외 완료' })).toBeOnTheScreen();
    expect(screen.getByText('해커톤 준비 · D+5')).toBeOnTheScreen();
  });

  it('오늘 할 일을 체크박스로 보여주고, 누르면 완료 상태가 바뀐다', async () => {
    await renderWithStore(<TodayScreen />);
    const cleaning = screen.getByRole('checkbox', { name: '동아리방 청소 완료' });
    expect(cleaning).not.toBeChecked();

    await fireEvent.press(cleaning);
    expect(screen.getByRole('checkbox', { name: '동아리방 청소 완료' })).toBeChecked();
  });

  it('할 일이 없으면 빈 상태 안내를 보여준다', async () => {
    await renderWithStore(<TodayScreen />, { tasks: [] });
    expect(screen.getByText('오늘 예정된 작업이 없어요.')).toBeOnTheScreen();
    expect(screen.queryByText(/밀린 작업/)).toBeNull();
  });

  it('새 프로젝트 등록으로 이동한다', async () => {
    await renderWithStore(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '새 프로젝트 등록' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });
});
