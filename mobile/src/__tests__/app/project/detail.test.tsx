import { fireEvent, screen } from '@testing-library/react-native';

import ProjectDetailScreen from '@/app/project/[id]/index';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
  mockParams.current = { id: 'p-embedded' };
});

describe('프로젝트 상세 화면', () => {
  it('프로젝트 정보와 태스크 목록을 보여준다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.getByRole('header', { name: '임베디드 팀프로젝트' })).toBeOnTheScreen();
    expect(screen.getByText('팀원 4명, 정해진 주제 없음')).toBeOnTheScreen();
    for (const title of ['주제 선정', '아이디어 선정', '부품 구매', '펌웨어 개발']) {
      expect(screen.getByRole('checkbox', { name: `${title} 완료` })).toBeOnTheScreen();
    }
  });

  it('태스크를 누르면 수정 화면으로 이동한다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^부품 구매/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/p-embedded/task/t-parts');
  });

  it('프로젝트 일정 확인으로 이동한다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '일정 확인' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/p-embedded/schedule');
  });

  it('없는 프로젝트면 안내를 보여준다', async () => {
    mockParams.current = { id: 'nope' };
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.getByText('프로젝트를 찾을 수 없어요.')).toBeOnTheScreen();
  });
});
