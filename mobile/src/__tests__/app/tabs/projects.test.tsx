import { fireEvent, screen } from '@testing-library/react-native';

import ProjectsScreen from '@/app/(tabs)/projects';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('프로젝트 목록 화면', () => {
  it('프로젝트마다 진행률·마감·지연을 보여준다', async () => {
    await renderWithStore(<ProjectsScreen />);
    expect(screen.getByRole('button', { name: '해커톤 준비, 0/1 완료 · 마감 D-20 · 지연 1건' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '임베디드 팀프로젝트, 0/4 완료 · 마감일 미정' })).toBeOnTheScreen();
  });

  it('프로젝트를 누르면 상세로 이동한다', async () => {
    await renderWithStore(<ProjectsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^해커톤 준비/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/p-hackathon');
  });

  it('새 프로젝트 등록으로 이동한다', async () => {
    await renderWithStore(<ProjectsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '새 프로젝트 등록' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });
});
