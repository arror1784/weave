import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as authApi from '@/api/auth';
import * as chatApi from '@/api/chat';
import { NetworkError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ChatResponse } from '@/api/types';
import { AppRoutes } from '@/App';
import type { Draft } from '@/state/draft';
import { draftRef, renderWithProviders, testUser } from '@/test/render';

vi.mock('@/api/auth');
vi.mock('@/api/chat');
vi.mock('@/api/projects');
const auth = vi.mocked(authApi);
const chat = vi.mocked(chatApi);

const draft: Draft = {
  name: '임베디드시스템 과제', description: '3인 팀플', deadline: '2026-10-24', deliverable: '보고서', progress: '', color: 'teal',
  attachments: [{ id: 11, kind: 'file', name: '공지.pdf' }], chat: [], tasks: [], conversationId: 'c-1',
};
const question: ChatResponse = { type: 'question', message: '팀에서 **맡은 부분**이 무엇인가요?' };
const proposal: ChatResponse = {
  type: 'tasks',
  message: '아래 작업 목록을 확인해 주세요.',
  tasks: [
    { key: 'k1', title: '개념 정리', description: '', estimatedHours: 2, dependsOnKey: null, prerequisite: true, aiDueDate: '2026-10-20' },
    { key: 'k2', title: '설계 문서 작성', description: '', estimatedHours: 2.5, dependsOnKey: 'k1', prerequisite: false, aiDueDate: '2026-10-22' },
  ],
  assumptions: ['하루 3시간을 쓸 수 있어요.'],
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.restoreSession.mockResolvedValue(testUser);
  vi.mocked(projectsApi).listProjects.mockResolvedValue({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
});

describe('W4 AI 챗봇', () => {
  it('들어오면 기본 정보·첨부·대화 번호로 첫 질문을 받아 보여준다 — 굵게는 굵게, 질문 n/5 표시는 없다', async () => {
    let resolve!: (r: ChatResponse) => void;
    chat.sendChat.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithProviders(<AppRoutes />, { route: '/new/chat', draft });
    expect(await screen.findByText('프로젝트 정보를 읽고 첫 질문을 준비하고 있어요…')).toBeInTheDocument();
    expect(chat.sendChat).toHaveBeenCalledWith(
      { name: '임베디드시스템 과제', description: '3인 팀플', deadline: '2026-10-24', deliverable: '보고서', progress: '' },
      [],
      [11],
      'c-1',
    );
    resolve(question);
    expect(await screen.findByText('맡은 부분', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('질문에 답하면 AI가 작업 목록을 제안해요.')).toBeInTheDocument();
    expect(screen.queryByText(/질문 \d\/5/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /작업 검토하기/ })).toBeDisabled();
  });

  it('답을 보내면(Enter) 지금까지의 대화를 함께 보내고, Shift+Enter는 줄바꿈', async () => {
    chat.sendChat.mockResolvedValueOnce(question).mockResolvedValueOnce({ type: 'question', message: '시연 영상은 누가 찍나요?' });
    renderWithProviders(<AppRoutes />, { route: '/new/chat', draft });
    const input = await screen.findByLabelText(/메시지/);
    await screen.findByText('맡은 부분', { selector: 'strong' });
    await userEvent.type(input, '센서 드라이버{Shift>}{Enter}{/Shift}보고서');
    expect(input).toHaveValue('센서 드라이버\n보고서');
    await userEvent.type(input, '{Enter}');
    expect(await screen.findByText('시연 영상은 누가 찍나요?')).toBeInTheDocument();
    expect(chat.sendChat).toHaveBeenLastCalledWith(
      expect.anything(),
      [
        { role: 'assistant', text: '팀에서 **맡은 부분**이 무엇인가요?' },
        { role: 'user', text: '센서 드라이버\n보고서' },
      ],
      [11],
      'c-1',
    );
    expect(input).toHaveValue('');
  });

  it('작업을 제안하면 카드(개수·총 시간·가정)를 보여주고, 검토로 넘어가면 초안에 작업을 담는다', async () => {
    chat.sendChat.mockResolvedValue(proposal);
    renderWithProviders(<AppRoutes />, { route: '/new/chat', draft });
    const card = await screen.findByRole('region', { name: '제안한 작업 목록' });
    expect(card).toHaveTextContent('제안한 작업 2개');
    expect(within(card).getByText('총 4.5시간')).toBeInTheDocument();
    expect(within(card).getByText('하루 3시간을 쓸 수 있어요.')).toBeInTheDocument();
    expect(screen.getByText('작업 목록을 받았어요. 고칠 점을 말하거나 검토로 넘어가세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/메시지/)).toHaveAttribute('placeholder', '고칠 점을 말해 주세요');
    await userEvent.click(screen.getByRole('button', { name: /작업 검토하기/ }));
    expect(draftRef.current?.tasks.map((t) => t.title)).toEqual(['개념 정리', '설계 문서 작성']);
    expect(await screen.findByRole('heading', { name: '작업 검토' })).toBeInTheDocument();
  });

  it('답을 받지 못하면 오류를 보여주고 다시 시도한다', async () => {
    chat.sendChat.mockRejectedValueOnce(new NetworkError()).mockResolvedValue(question);
    renderWithProviders(<AppRoutes />, { route: '/new/chat', draft });
    expect(await screen.findByText('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/메시지/)).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('맡은 부분', { selector: 'strong' })).toBeInTheDocument();
  });

  it('등록 중인 초안이 없으면(새로고침 등) 처음부터 하라고 안내한다', async () => {
    renderWithProviders(<AppRoutes />, { route: '/new/chat' });
    expect(await screen.findByText('등록 중인 프로젝트가 없어요.')).toBeInTheDocument();
    expect(chat.sendChat).not.toHaveBeenCalled();
  });
});
