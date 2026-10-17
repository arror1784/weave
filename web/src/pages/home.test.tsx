import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as authApi from '@/api/auth';
import { NetworkError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProjectSummary } from '@/api/types';
import { AppRoutes } from '@/App';
import { renderWithProviders, testUser } from '@/test/render';

vi.mock('@/api/auth');
vi.mock('@/api/projects');
const auth = vi.mocked(authApi);
const projects = vi.mocked(projectsApi);

const summary = (p: Partial<ProjectSummary>): ProjectSummary => ({
  id: 1, name: '임베디드시스템 과제', description: '', deadline: '2026-10-20', status: 'active', color: 'teal',
  doneCount: 3, totalCount: 8, overdueCount: 0, firstOverdueTitle: null, nextTaskTitle: null, ...p,
});
const page = (items: ProjectSummary[]) => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00+09:00'));
  auth.restoreSession.mockResolvedValue(testUser);
});
afterEach(() => vi.useRealTimers());

describe('W2 홈', () => {
  it('진행중 프로젝트: 이름·색 이름·D-day(마감 없으면 상시)·진행률을 보여주고 진행중만 서버에 묻는다', async () => {
    projects.listProjects.mockResolvedValue(page([summary({}), summary({ id: 2, name: 'TOEIC 스터디', deadline: null, color: 'amber', doneCount: 9, totalCount: 20 })]));
    renderWithProviders(<AppRoutes />);
    expect(await screen.findByText('임베디드시스템 과제')).toBeInTheDocument();
    expect(projects.listProjects).toHaveBeenCalledWith('active', 0, expect.any(Number));
    expect(screen.getByText('D-3')).toBeInTheDocument();
    expect(screen.getByText('청록')).toBeInTheDocument();
    expect(screen.getByText('3/8')).toBeInTheDocument();
    expect(screen.getByText('상시')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'TOEIC 스터디 진행률' })).toHaveAttribute('aria-valuenow', '45');
  });

  it('AI에게 재요청을 누르면 그 프로젝트의 기본 정보 단계로 간다', async () => {
    projects.listProjects.mockResolvedValue(page([summary({ id: 5 })]));
    projects.getProject.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: '임베디드시스템 과제 AI에게 재요청' }));
    expect(projects.getProject).toHaveBeenCalledWith(5);
  });

  it('새 프로젝트 등록을 누르면 기본 정보 단계로 간다', async () => {
    projects.listProjects.mockResolvedValue(page([]));
    renderWithProviders(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: /새 프로젝트 등록/ }));
    expect(await screen.findByRole('heading', { name: '새 프로젝트 등록' })).toBeInTheDocument();
  });

  it('빈 목록이면 안내한다', async () => {
    projects.listProjects.mockResolvedValue(page([]));
    renderWithProviders(<AppRoutes />);
    expect(await screen.findByText('진행중인 프로젝트가 없어요')).toBeInTheDocument();
  });

  it('불러오지 못하면 오류와 다시 시도 — 다시 시도하면 다시 묻는다', async () => {
    projects.listProjects.mockRejectedValueOnce(new NetworkError()).mockResolvedValue(page([summary({})]));
    renderWithProviders(<AppRoutes />);
    await userEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('임베디드시스템 과제')).toBeInTheDocument();
  });
});
