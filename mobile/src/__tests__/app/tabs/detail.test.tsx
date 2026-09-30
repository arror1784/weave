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

  it('작업을 누르면 수정 시트가 열리고 제목·소요 시간·선행 작업을 저장한다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^발표자료 제작 수정/ }));
    const sheet = screen.getByLabelText('작업 수정');
    await fireEvent.changeText(within(sheet).getByLabelText('제목'), '발표자료 제작 (슬라이드)');
    await fireEvent.press(within(sheet).getByRole('radio', { name: '4시간' }));
    await fireEvent.press(within(sheet).getByRole('radio', { name: '보고서 v2 초안 작성' }));
    await fireEvent.press(within(sheet).getByRole('button', { name: '저장' }));
    expect(storeRef.current?.tasks.find((t) => t.id === 'e-slides')).toMatchObject({ title: '발표자료 제작 (슬라이드)', estimatedHours: 4, dependsOn: 'e-report' });
    expect(screen.getByText('작업을 수정했어요')).toBeOnTheScreen();
  });

  it('수정 시트에서 삭제한다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^발표자료 제작 수정/ }));
    await fireEvent.press(within(screen.getByLabelText('작업 수정')).getByRole('button', { name: '삭제' }));
    expect(storeRef.current?.tasks.some((t) => t.id === 'e-slides')).toBe(false);
  });

  it('작업 추가는 새 작업을 만들고 수정 시트를 연다', async () => {
    await renderWithStore(<ProjectDetailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '작업 추가' }));
    expect(storeRef.current?.tasks.filter((t) => t.projectId === 'p-embedded')).toHaveLength(6);
    expect(screen.getByLabelText('작업 수정')).toBeOnTheScreen();
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
