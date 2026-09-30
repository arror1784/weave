import { fireEvent, screen } from '@testing-library/react-native';

import ProjectsScreen from '@/app/(tabs)/projects/index';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('프로젝트 목록', () => {
  it('진행중 프로젝트를 마감 가까운 순으로, 상시는 뒤에 보여준다', async () => {
    await renderWithStore(<ProjectsScreen />);
    const cards = screen.getAllByRole('button', { name: /완료 ·/ });
    expect(cards.map((c) => c.props.accessibilityLabel.split(',')[0])).toEqual(['임베디드시스템 과제', '창업동아리', '알고리즘 스터디']);
  });

  it('카드에 D-day·안내 문구·진행률을 담는다', async () => {
    await renderWithStore(<ProjectsScreen />);
    expect(screen.getByRole('button', { name: '창업동아리, D-17, 지연 1건 · 행사 장소 섭외, 0/4 완료 · 0%' })).toBeOnTheScreen();
    expect(screen.getByText('상시')).toBeOnTheScreen();
  });

  it('카드를 누르면 상세로 간다', async () => {
    await renderWithStore(<ProjectsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^임베디드시스템 과제/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/projects/p-embedded');
  });

  it('완료 필터에 프로젝트가 없으면 안내를 보여준다', async () => {
    await renderWithStore(<ProjectsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(screen.getByText(/아직 완료한 프로젝트가 없어요/)).toBeOnTheScreen();
  });
});
