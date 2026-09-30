import { screen } from '@testing-library/react-native';

import ProjectScheduleScreen from '@/app/project/[id]/schedule';
import { mockParams, resetRouterMock } from '@/test-utils/router';
import { renderWithStore } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
  mockParams.current = { id: 'p-hackathon' };
});

describe('프로젝트별 일정 확인 화면', () => {
  it('그 프로젝트의 작업만 일정별로 보여준다', async () => {
    await renderWithStore(<ProjectScheduleScreen />);
    expect(screen.getByRole('header', { name: '밀린 작업' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: '해커톤 장소 섭외 완료' })).toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: '동아리방 청소 완료' })).toBeNull();
  });
});
