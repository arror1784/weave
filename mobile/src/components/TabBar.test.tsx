import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { TabBar } from './TabBar';

/** 하단 탭에 넘어오는 navigation 상태 — 프로젝트 탭 안에는 목록(index) 위에 상세가 쌓여 있다 */
function setup(focusedTab: number) {
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn(), dispatch: jest.fn() };
  const state = {
    index: focusedTab,
    routes: [
      { key: 'index-1', name: 'index' },
      { key: 'schedule-1', name: 'schedule' },
      { key: 'projects-1', name: 'projects', state: { key: 'projects-stack', index: 1, routes: [{ name: 'index' }, { name: '[id]' }] } },
      { key: 'settings-1', name: 'settings' },
    ],
  };
  return { navigation, props: { state, navigation } as unknown as Parameters<typeof TabBar>[0] };
}

describe('하단 탭', () => {
  it('다른 탭에서 프로젝트 탭을 누르면 상세가 아니라 목록으로 간다', async () => {
    const { navigation, props } = setup(0);
    await renderWithProviders(<TabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: '프로젝트' }));
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP', target: 'projects-stack' });
    expect(navigation.navigate).toHaveBeenCalledWith('projects');
  });

  it('프로젝트 상세를 보다가 프로젝트 탭을 다시 눌러도 목록으로 돌아간다', async () => {
    const { navigation, props } = setup(2);
    await renderWithProviders(<TabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: '프로젝트' }));
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP', target: 'projects-stack' });
  });

  it('안에 쌓인 화면이 없는 탭은 그냥 이동만 한다', async () => {
    const { navigation, props } = setup(2);
    await renderWithProviders(<TabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: '설정' }));
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('settings');
  });
});
