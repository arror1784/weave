import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import { AppRoutes } from '@/App';
import { renderWithProviders, testUser } from '@/test/render';

vi.mock('@/api/auth');
vi.mock('@/api/projects');
const auth = vi.mocked(authApi);
const projects = vi.mocked(projectsApi);

beforeEach(() => {
  vi.clearAllMocks();
  projects.listProjects.mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
});

describe('로그인 상태에 따른 화면', () => {
  it('쿠키로 되살리지 못하면 로그인 화면을 보여준다', async () => {
    auth.restoreSession.mockResolvedValue(null);
    renderWithProviders(<AppRoutes />, { route: '/' });
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('쿠키로 되살리면 바로 홈으로 간다', async () => {
    auth.restoreSession.mockResolvedValue(testUser);
    renderWithProviders(<AppRoutes />, { route: '/login' });
    expect(await screen.findByRole('heading', { name: '안녕하세요' })).toBeInTheDocument();
  });
});

describe('W1 로그인', () => {
  beforeEach(() => auth.restoreSession.mockResolvedValue(null));

  it('이메일·비밀번호로 로그인하면 홈으로 간다', async () => {
    auth.login.mockResolvedValue(testUser);
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText('이메일'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'weave2026!');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(auth.login).toHaveBeenCalledWith('me@example.com', 'weave2026!', true);
    expect(await screen.findByRole('heading', { name: '안녕하세요' })).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument(); // 상단 바
  });

  it("'로그인 상태 유지'는 처음에 켜져 있고, 끄고 로그인하면 끈 채로 보낸다 (사용자 결정 2026-10-22)", async () => {
    auth.login.mockResolvedValue(testUser);
    renderWithProviders(<AppRoutes />, { route: '/login' });
    const keep = await screen.findByRole('checkbox', { name: '로그인 상태 유지' });
    expect(keep).toBeChecked();
    await userEvent.click(keep);
    expect(keep).not.toBeChecked();
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'weave2026!');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(auth.login).toHaveBeenCalledWith('me@example.com', 'weave2026!', false);
  });

  it('틀리면 서버 메시지를 알리고 화면에 남는다', async () => {
    auth.login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 맞지 않아요.'));
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText('이메일'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 맞지 않아요.');
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('로그아웃하면 로그인 화면으로 돌아간다', async () => {
    auth.restoreSession.mockResolvedValue(testUser);
    auth.logout.mockResolvedValue();
    renderWithProviders(<AppRoutes />, { route: '/' });
    await userEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });
});
