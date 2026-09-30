import { fireEvent, screen, within } from '@testing-library/react-native';

import ProjectDetailScreen from '@/app/(tabs)/projects/[id]';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
  mockParams.current = { id: 'p-embedded' };
});

describe('프로젝트 상세', () => {
  it('프로젝트 정보·진행률·D-day를 보여준다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.getByRole('header', { name: '임베디드시스템 과제' })).toBeOnTheScreen();
    expect(screen.getByText('1/5 · 20%')).toBeOnTheScreen();
    expect(screen.getByText('D-9')).toBeOnTheScreen();
  });

  it('태스크 탭: 선행 작업을 보여주고 체크로 완료한다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.getByText('선행: 설계 문서 작성 필요')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: '설계 문서 작성 완료' }));
    expect(storeRef.current?.tasks.find((t) => t.id === 'e-design')?.done).toBe(true);
  });

  it('등록된 작업은 고칠 수 없다: 작업 수정·작업 추가가 없다 (완료 체크만 가능)', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '작업 추가' })).toBeNull();
    expect(screen.queryByLabelText('작업 수정')).toBeNull();
  });

  it('프로젝트 색을 바꾼다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '프로젝트 색 바꾸기' }));
    const sheet = screen.getByLabelText('프로젝트 색');
    expect(within(sheet).getByRole('radio', { name: '청록' })).toBeSelected();
    await fireEvent.press(within(sheet).getByRole('radio', { name: '파랑' }));
    expect(storeRef.current?.projects.find((p) => p.id === 'p-embedded')?.color).toBe('blue');
    expect(screen.queryByLabelText('프로젝트 색')).toBeNull();
  });

  it('AI에게 재요청하면 등록 흐름으로 간다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'AI에게 재요청' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });

  it('일정 탭: 간트 막대와 밀린 작업이 뒤 작업에 주는 영향을 알려준다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: '일정' }));
    expect(screen.getByLabelText(/^설계 문서 작성, 9\/29부터 1일, 3시간, 밀림/)).toBeOnTheScreen();
    expect(screen.getByText(/설계 문서 작성이 밀려서 보고서 v2 초안 작성 시작이 늦어질 수 있어요/)).toBeOnTheScreen();
  });

  it('없는 프로젝트면 안내를 보여준다', async () => {
    mockParams.current = { id: 'nope' };
    await renderWithStore(<ProjectDetailScreen />);
    expect(screen.getByText('프로젝트를 찾을 수 없어요.')).toBeOnTheScreen();
  });
});
