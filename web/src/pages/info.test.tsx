import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as attachmentsApi from '@/api/attachments';
import * as authApi from '@/api/auth';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProjectDetail, ProjectSummary } from '@/api/types';
import { AppRoutes } from '@/App';
import { draftRef, renderWithProviders, testUser } from '@/test/render';

vi.mock('@/api/auth');
vi.mock('@/api/projects');
vi.mock('@/api/attachments');
const auth = vi.mocked(authApi);
const projects = vi.mocked(projectsApi);
const attachments = vi.mocked(attachmentsApi);

const summary = (id: number, color: ProjectSummary['color']): ProjectSummary => ({
  id, name: `p${id}`, description: '', deadline: null, status: 'active', color, doneCount: 0, totalCount: 1, overdueCount: 0, firstOverdueTitle: null, nextTaskTitle: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00+09:00'));
  auth.restoreSession.mockResolvedValue(testUser);
  projects.listProjects.mockResolvedValue({ items: [summary(1, 'teal'), summary(2, 'magenta')], page: 0, size: 50, totalElements: 2, totalPages: 1 });
});
afterEach(() => vi.useRealTimers());

async function fillName(name = '임베디드시스템 과제') {
  await userEvent.type(await screen.findByLabelText(/프로젝트명/), name);
}

describe('W3 기본 정보', () => {
  it('프로젝트명이 없으면 다음으로 가지 않고 알려준다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await screen.findByLabelText(/프로젝트명/);
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('프로젝트명을 입력해 주세요.')).toBeInTheDocument();
    expect(draftRef.current).toBeNull();
  });

  it('입력한 기본 정보로 초안을 시작한다 — 기본 색은 진행중 프로젝트가 쓰지 않은 색(보라)', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    await userEvent.type(screen.getByLabelText(/설명·목표/), '3인 팀플');
    await userEvent.type(screen.getByLabelText('결과물 형태'), '보고서');
    await userEvent.type(screen.getByLabelText(/기 진행사항/), '환경 설치 끝');
    expect(await screen.findByRole('radio', { name: '보라' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({ name: '임베디드시스템 과제', description: '3인 팀플', deliverable: '보고서', progress: '환경 설치 끝', color: 'violet', deadline: null, attachments: [] });
    expect(draftRef.current?.projectId).toBeUndefined();
  });

  it('마감일: 달력에서 지난 날짜도 고르고 D-day를 보여준다, "마감 없음(상시)"으로 되돌린다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    await userEvent.click(screen.getByRole('button', { name: /마감일/ }));
    const dialog = screen.getByRole('dialog', { name: '마감일 선택' });
    await userEvent.click(within(dialog).getByRole('button', { name: '이전 달' }));
    await userEvent.click(within(dialog).getByRole('button', { name: '9월 30일 수요일' }));
    expect(screen.getByText('D+17')).toBeInTheDocument();
    expect(screen.getByText('이미 지난 날짜예요')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: '마감 없음(상시)' }));
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.deadline).toBeNull();
  });

  it('고른 마감일은 초안에 YYYY-MM-DD로 들어간다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    await userEvent.click(screen.getByRole('button', { name: /마감일/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '10월 24일 토요일' }));
    expect(screen.getByText('D-7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.deadline).toBe('2026-10-24');
  });

  it('파일을 고르면 바로 올리고, 거절되면 서버가 알려 준 이유를 보여준다', async () => {
    attachments.uploadAttachment
      .mockResolvedValueOnce({ id: 11, kind: 'file', name: '공지.pdf', size: 1200 })
      .mockRejectedValueOnce(new ApiError(400, 'FILE_REJECTED', '위치정보가 있는 HEIC 사진은 올릴 수 없어요.'));
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    const input = screen.getByLabelText('파일 고르기');
    await userEvent.upload(input, [new File(['a'], '공지.pdf', { type: 'application/pdf' })]);
    expect(await screen.findByRole('button', { name: '공지.pdf 삭제' })).toBeInTheDocument();
    await userEvent.upload(input, [new File(['b'], '회로도.heic', { type: 'image/heic' })]);
    expect(await screen.findByText('위치정보가 있는 HEIC 사진은 올릴 수 없어요.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.attachments).toEqual([{ id: 11, kind: 'file', name: '공지.pdf', size: 1200 }]);
  });

  it('올리는 동안 진행률(%)을 막대와 숫자로 보여준다 (사용자 결정 2026-10-18)', async () => {
    let report: ((p: number) => void) | undefined;
    let finish: ((a: { id: number; kind: 'file'; name: string; size: number }) => void) | undefined;
    attachments.uploadAttachment.mockImplementation((_file, onProgress) => {
      report = onProgress;
      return new Promise((resolve) => (finish = resolve));
    });
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    await userEvent.upload(screen.getByLabelText('파일 고르기'), [new File(['a'], '큰 자료.pdf', { type: 'application/pdf' })]);
    expect(await screen.findByText('올리는 중 0%')).toBeInTheDocument();
    act(() => report?.(40));
    expect(screen.getByText('올리는 중 40%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '큰 자료.pdf 올리는 중' })).toHaveAttribute('aria-valuenow', '40');
    await act(async () => finish?.({ id: 31, kind: 'file', name: '큰 자료.pdf', size: 9 }));
    expect(await screen.findByRole('button', { name: '큰 자료.pdf 삭제' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('파일을 끌어다 놓아도 올린다', async () => {
    attachments.uploadAttachment.mockResolvedValue({ id: 12, kind: 'image', name: '캡처.png', size: 10 });
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    const zone = screen.getByText('파일을 끌어다 놓으세요').closest('div')!;
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['c'], '캡처.png', { type: 'image/png' })] } });
    // 올리는 동안 "올리는 중", 다 올리면 삭제할 수 있는 첨부가 된다
    expect(await screen.findByRole('button', { name: '캡처.png 삭제' })).toBeInTheDocument();
    expect(attachments.uploadAttachment).toHaveBeenCalledWith(expect.objectContaining({ name: '캡처.png' }), expect.any(Function));
  });

  it('링크를 추가하고(https만), 첨부를 지운다', async () => {
    attachments.addLink.mockResolvedValue({ id: 13, kind: 'link', name: 'https://example.com', url: 'https://example.com' });
    attachments.deleteAttachment.mockResolvedValue(undefined);
    renderWithProviders(<AppRoutes />, { route: '/new' });
    await fillName();
    await userEvent.type(screen.getByLabelText('링크 추가'), 'ftp://x');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(screen.getByText('https://로 시작하는 주소를 입력해 주세요.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('링크 추가'));
    await userEvent.type(screen.getByLabelText('링크 추가'), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(attachments.addLink).toHaveBeenCalledWith('https://example.com');
    await userEvent.click(await screen.findByRole('button', { name: 'https://example.com 삭제' }));
    expect(attachments.deleteAttachment).toHaveBeenCalledWith(13);
    expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
  });
});

describe('AI에게 재요청 → W3', () => {
  const existing: ProjectDetail = {
    id: 5, name: '창업동아리', description: '사업계획서', deadline: '2026-11-01', status: 'active', color: 'amber', deliverable: 'PDF', progress: '시장 조사 끝',
    attachments: [{ id: 21, kind: 'file', name: '양식.hwp', size: 100 }],
    tasks: [
      { id: 1, projectId: 5, title: '아이디어 정리', description: '', estimatedHours: 1, dependsOnId: null, scheduledDate: null, spanDays: 1, days: [], dueDate: null, done: true, prerequisite: false, delayedFrom: null },
      { id: 2, projectId: 5, title: '초안 작성', description: '', estimatedHours: 2, dependsOnId: null, scheduledDate: null, spanDays: 1, days: [], dueDate: null, done: false, prerequisite: false, delayedFrom: null },
    ],
  };

  it('기존 기본 정보·색·첨부를 채우고, 다음을 누르면 그 프로젝트와 끝낸 작업 제목을 초안에 담는다', async () => {
    projects.getProject.mockResolvedValue(existing);
    renderWithProviders(<AppRoutes />, { route: '/projects/5/replan' });
    expect(await screen.findByDisplayValue('창업동아리')).toBeInTheDocument();
    expect(screen.getByText('AI에게 재요청')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '황토' })).toBeChecked();
    expect(screen.getByText('양식.hwp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({ projectId: 5, completedTasks: ['아이디어 정리'], name: '창업동아리', deadline: '2026-11-01', deliverable: 'PDF', progress: '시장 조사 끝' });
  });

  it('프로젝트를 불러오지 못하면 오류와 다시 시도', async () => {
    projects.getProject.mockRejectedValueOnce(new ApiError(500, 'X', '오류')).mockResolvedValue(existing);
    renderWithProviders(<AppRoutes />, { route: '/projects/5/replan' });
    await userEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByDisplayValue('창업동아리')).toBeInTheDocument();
  });
});
