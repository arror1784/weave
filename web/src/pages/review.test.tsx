import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as authApi from '@/api/auth';
import * as chatApi from '@/api/chat';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProjectDetail } from '@/api/types';
import { AppRoutes } from '@/App';
import type { Draft } from '@/state/draft';
import { draftRef, renderWithProviders, testUser } from '@/test/render';

vi.mock('@/api/auth');
vi.mock('@/api/chat');
vi.mock('@/api/projects');
const auth = vi.mocked(authApi);
const chat = vi.mocked(chatApi);
const projects = vi.mocked(projectsApi);

const draft = (over: Partial<Draft> = {}): Draft => ({
  name: '임베디드시스템 과제', description: '3인 팀플', deadline: '2026-10-24', deliverable: '보고서', progress: '', color: 'teal',
  attachments: [{ id: 11, kind: 'file', name: '공지.pdf' }], conversationId: 'c-1',
  chat: [{ role: 'assistant', text: '목록이에요.' }],
  tasks: [
    { key: 'k1', title: '개념 정리', description: '목표: RTOS 이해', estimatedHours: 2, dependsOnKey: null, prerequisite: true, aiDueDate: '2026-10-20' },
    { key: 'k2', title: '설계 문서 작성', description: '', estimatedHours: 6, dependsOnKey: 'k1', prerequisite: false, aiDueDate: '2026-10-22' },
    { key: 'k3', title: '보고서 작성', description: '', estimatedHours: 1.5, dependsOnKey: null, prerequisite: false, aiDueDate: null },
  ],
  ...over,
});
const saved = (id: number): ProjectDetail => ({ id, name: '임베디드시스템 과제', description: '', deadline: '2026-10-24', status: 'active', color: 'teal', deliverable: '', progress: '', tasks: [], attachments: [] });

beforeEach(() => {
  vi.clearAllMocks();
  auth.restoreSession.mockResolvedValue(testUser);
  projects.listProjects.mockResolvedValue({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
});

describe('W5 작업 검토', () => {
  it('작업 개수·총 시간, 선행 지식 배지, 선행 연결, AI 계산 마감(참고)을 보여준다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    expect(await screen.findByRole('heading', { name: /작업 3개 · 총 9.5시간/ })).toBeInTheDocument();
    expect(screen.getByText('선행 지식 학습')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '선행 작업 연결 해제: 개념 정리' })).toBeInTheDocument();
    expect(screen.getByText('AI 계산 마감 10/20 (참고)')).toBeInTheDocument();
  });

  it('이름·시간(0.5 단위, 위로 상한 없음)을 고치고 설명을 펼친다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    const name = await screen.findByLabelText('3번 작업 이름');
    await userEvent.clear(name);
    await userEvent.type(name, '결과 보고서 작성');
    await userEvent.click(screen.getByRole('button', { name: '2번 작업 30분 늘리기' }));
    await userEvent.click(screen.getByRole('button', { name: '3번 작업 30분 줄이기' }));
    expect(draftRef.current?.tasks.map((t) => [t.title, t.estimatedHours])).toEqual([
      ['개념 정리', 2],
      ['설계 문서 작성', 6.5],
      ['결과 보고서 작성', 1],
    ]);
    await userEvent.click(screen.getByRole('button', { name: '1번 작업 설명 보기' }));
    expect(screen.getByText('목표: RTOS 이해')).toBeInTheDocument();
  });

  it('순서는 선행 작업을 지키는 한해서 바꾸고, 지우면 그 작업을 선행으로 둔 연결도 풀린다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    expect(await screen.findByRole('button', { name: '2번 작업 위로' })).toBeDisabled(); // 선행 작업(1번) 위로는 못 간다
    await userEvent.click(screen.getByRole('button', { name: '3번 작업 위로' }));
    expect(draftRef.current?.tasks.map((t) => t.key)).toEqual(['k1', 'k3', 'k2']);
    await userEvent.click(screen.getByRole('button', { name: '1번 작업 삭제' }));
    expect(draftRef.current?.tasks.find((t) => t.key === 'k2')?.dependsOnKey).toBeNull();
  });

  it('선행 작업을 앞의 작업 중에서 고르고, 눌러서 푼다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    await userEvent.selectOptions(await screen.findByLabelText('3번 작업 선행 작업 연결'), '설계 문서 작성 완료 후');
    expect(draftRef.current?.tasks[2].dependsOnKey).toBe('k2');
    await userEvent.click(screen.getByRole('button', { name: '선행 작업 연결 해제: 설계 문서 작성' }));
    expect(draftRef.current?.tasks[2].dependsOnKey).toBeNull();
  });

  it('이름 없는 작업이 있으면 등록 완료를 막고 알려준다 · 작업을 직접 추가한다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    await userEvent.click(await screen.findByRole('button', { name: /작업 직접 추가/ }));
    expect(draftRef.current?.tasks).toHaveLength(4);
    await userEvent.clear(screen.getByLabelText('4번 작업 이름'));
    expect(screen.getByText(/이름 없는 작업/)).toHaveTextContent('이름 없는 작업 1개가 있어요');
    expect(screen.getByRole('button', { name: /등록 완료/ })).toBeDisabled();
  });

  it('등록 완료: AI 마감일 없이 작업·첨부·대화 번호를 보내고, 완료 화면에 빠듯한 작업 수를 알린 뒤 초안을 비운다', async () => {
    projects.createProject.mockResolvedValue({ project: saved(9), lateCount: 2 });
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    await userEvent.click(await screen.findByRole('button', { name: /등록 완료/ }));
    expect(projects.createProject).toHaveBeenCalledWith({
      name: '임베디드시스템 과제', description: '3인 팀플', deadline: '2026-10-24', color: 'teal', deliverable: '보고서', progress: '',
      tasks: [
        { key: 'k1', title: '개념 정리', description: '목표: RTOS 이해', estimatedHours: 2, dependsOnKey: null, prerequisite: true },
        { key: 'k2', title: '설계 문서 작성', description: '', estimatedHours: 6, dependsOnKey: 'k1', prerequisite: false },
        { key: 'k3', title: '보고서 작성', description: '', estimatedHours: 1.5, dependsOnKey: null, prerequisite: false },
      ],
      attachmentIds: [11],
      conversationId: 'c-1',
    });
    expect(await screen.findByRole('heading', { name: '등록했어요' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('작업 3개를 다른 프로젝트와 함께 일정에 다시 배치했어요.');
    expect(screen.getByRole('status')).toHaveTextContent('마감이 빠듯한 작업 2개');
    expect(draftRef.current).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(await screen.findByRole('heading', { name: '안녕하세요' })).toBeInTheDocument();
  });

  it('재요청이면 끝낸 작업을 잠금으로 보여주고, 그 프로젝트의 작업을 바꾼다', async () => {
    projects.replaceProjectTasks.mockResolvedValue({ project: saved(5), lateCount: 0 });
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft({ projectId: 5, completedTasks: ['아이디어 정리'] }) });
    const done = await screen.findByRole('region', { name: '이미 끝낸 작업' });
    expect(within(done).getByText('아이디어 정리')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /등록 완료/ }));
    expect(projects.replaceProjectTasks).toHaveBeenCalledWith(5, expect.objectContaining({ name: '임베디드시스템 과제' }));
    expect(projects.createProject).not.toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: '작업을 다시 나눴어요' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveTextContent('마감이 빠듯한');
  });

  it('등록에 실패하면 서버 메시지를 보여주고 검토 화면에 남는다', async () => {
    projects.createProject.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', '작업 이름을 확인해 주세요.'));
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    await userEvent.click(await screen.findByRole('button', { name: /등록 완료/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('작업 이름을 확인해 주세요.');
    expect(draftRef.current).not.toBeNull();
  });

  it('AI에게 다시 정리 요청: 고친 목록을 대화에 붙여 보내고 챗봇 화면에서 답을 보여준다', async () => {
    chat.sendChat.mockResolvedValue({ type: 'tasks', message: '반영했어요.', tasks: [{ key: 'n1', title: '새 정리', description: '', estimatedHours: 1, dependsOnKey: null, prerequisite: false, aiDueDate: null }] });
    renderWithProviders(<AppRoutes />, { route: '/new/review', draft: draft() });
    await userEvent.click(await screen.findByRole('button', { name: /AI에게 다시 정리 요청/ }));
    expect(chat.sendChat).toHaveBeenCalledWith(
      expect.anything(),
      [
        { role: 'assistant', text: '목록이에요.' },
        {
          role: 'user',
          text: '',
          tasks: [
            { title: '개념 정리', description: '목표: RTOS 이해', estimatedHours: 2, dependsOnTitle: null, prerequisite: true },
            { title: '설계 문서 작성', description: '', estimatedHours: 6, dependsOnTitle: '개념 정리', prerequisite: false },
            { title: '보고서 작성', description: '', estimatedHours: 1.5, dependsOnTitle: null, prerequisite: false },
          ],
        },
      ],
      [11],
      'c-1',
    );
    expect(await screen.findByText('반영했어요.')).toBeInTheDocument();
    expect(screen.getByText(/작업 목록을 고쳤어요 · 작업 3개 · 총 9.5시간/)).toBeInTheDocument();
    expect(draftRef.current?.tasks.map((t) => t.title)).toEqual(['새 정리']);
  });
});
