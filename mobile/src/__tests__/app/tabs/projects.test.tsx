import { fireEvent, screen } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import type { ProjectSummary } from '@/api/types';
import ProjectsScreen from '@/app/(tabs)/projects/index';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

const summary = (s: Partial<ProjectSummary> & Pick<ProjectSummary, 'id' | 'name'>): ProjectSummary => ({
  description: '',
  deadline: null,
  status: 'active',
  color: 'teal',
  doneCount: 0,
  totalCount: 4,
  overdueCount: 0,
  firstOverdueTitle: null,
  nextTaskTitle: null,
  ...s,
});
const page = (items: ProjectSummary[], p = 0, totalPages = 1) => ({ items, page: p, size: 20, totalElements: items.length + (totalPages - 1) * 20, totalPages });

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
  api.listProjects.mockImplementation(async (status) =>
    status === 'active'
      ? page([
          summary({ id: 1, name: '임베디드시스템 과제', deadline: '2026-10-09', doneCount: 1, totalCount: 5, nextTaskTitle: '보고서 v2 초안 작성' }),
          summary({ id: 2, name: '창업동아리', deadline: '2026-10-17', color: 'magenta', overdueCount: 1, firstOverdueTitle: '행사 장소 섭외' }),
          summary({ id: 3, name: '알고리즘 스터디', color: 'violet', nextTaskTitle: '개념 정리' }),
        ])
      : page([]),
  );
});

describe('프로젝트 목록', () => {
  it('서버가 정렬한 순서(마감 가까운 순, 상시는 뒤)대로 진행중 프로젝트를 보여준다', async () => {
    await renderWithProviders(<ProjectsScreen />);
    const cards = await screen.findAllByRole('button', { name: /완료 ·/ });
    expect(cards.map((c) => c.props.accessibilityLabel.split(',')[0])).toEqual(['임베디드시스템 과제', '창업동아리', '알고리즘 스터디']);
    expect(api.listProjects).toHaveBeenCalledWith('active', 0, 20);
  });

  it('카드에 D-day·안내 문구(지연 또는 다음 작업)·진행률을 담는다', async () => {
    await renderWithProviders(<ProjectsScreen />);
    expect(await screen.findByRole('button', { name: '창업동아리, D-17, 지연 1건 · 행사 장소 섭외, 0/4 완료 · 0%' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '임베디드시스템 과제, D-9, 다음: 보고서 v2 초안 작성, 1/5 완료 · 20%' })).toBeOnTheScreen();
    expect(screen.getByText('상시')).toBeOnTheScreen();
  });

  it('카드를 누르면 상세로 간다', async () => {
    await renderWithProviders(<ProjectsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^임베디드시스템 과제/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/projects/1');
  });

  it('완료 필터는 완료 목록을 따로 불러오고, 없으면 안내를 보여준다', async () => {
    await renderWithProviders(<ProjectsScreen />);
    await screen.findAllByRole('button', { name: /완료 ·/ });
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(await screen.findByText(/아직 완료한 프로젝트가 없어요/)).toBeOnTheScreen();
    expect(api.listProjects).toHaveBeenCalledWith('done', 0, 20);
  });

  it('다음 페이지가 있으면 더 보기로 이어서 불러온다', async () => {
    api.listProjects.mockImplementation(async (_status, p) =>
      p === 0 ? page([summary({ id: 1, name: '첫 페이지' })], 0, 2) : page([summary({ id: 2, name: '둘째 페이지' })], 1, 2),
    );
    await renderWithProviders(<ProjectsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '더 보기' }));
    expect(await screen.findByRole('button', { name: /^둘째 페이지/ })).toBeOnTheScreen();
  });
});
