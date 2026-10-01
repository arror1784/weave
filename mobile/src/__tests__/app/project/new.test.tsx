import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import * as attachmentsApi from '@/api/attachments';
import * as chatApi from '@/api/chat';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProposedTask } from '@/api/types';
import ChatScreen from '@/app/project/new/chat';
import { colors } from '@/theme/colors';
import NewProjectScreen from '@/app/project/new/index';
import ReviewScreen from '@/app/project/new/review';
import type { Draft } from '@/state/draft';
import { sampleSchedule } from '@/test-utils/fixtures';
import { draftRef, renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
jest.mock('@/api/attachments');
jest.mock('@/api/chat');
const projects = jest.mocked(projectsApi);
const attachments = jest.mocked(attachmentsApi);
const chat = jest.mocked(chatApi);

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  projects.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

const draft: Draft = { name: '임베디드시스템 과제', description: 'STM32', deadline: '2026-10-09', deliverable: '보고서', progress: '', color: 'violet', attachments: [], chat: [], tasks: [] };
const proposed: ProposedTask[] = [
  { key: 'k1', title: '관련 개념 학습 (인터럽트)', description: 'NVIC·EXTI 개념 정리, 예제 1개 실행', estimatedHours: 2, dependsOnKey: null, prerequisite: true, aiDueDate: '2026-10-03' },
  { key: 'k2', title: '설계 문서 작성', description: '블록도와 시퀀스', estimatedHours: 3, dependsOnKey: 'k1', prerequisite: false, aiDueDate: '2026-10-05' },
  { key: 'k3', title: '보고서 초안 작성', description: '', estimatedHours: 4, dependsOnKey: 'k2', prerequisite: false, aiDueDate: null },
  { key: 'k4', title: '발표자료 제작', description: '', estimatedHours: 2, dependsOnKey: null, prerequisite: false, aiDueDate: null },
];
const draftTasks = proposed.map(({ key, title, description, estimatedHours, dependsOnKey, prerequisite, aiDueDate }) => ({ key, title, description, estimatedHours, dependsOnKey, prerequisite, aiDueDate }));

describe('등록 1/3 기본 정보', () => {
  it('단계 표시와 입력칸을 보여준다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    expect(screen.getByText('1 / 3')).toBeOnTheScreen();
    for (const label of ['프로젝트명', '설명 · 목표', '결과물 형태', '기 진행사항']) expect(screen.getByLabelText(label)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '마감일, 선택 안 함 (상시)' })).toBeOnTheScreen();
  });

  it('프로젝트명이 없으면 다음으로 가지 않는다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('프로젝트명을 입력해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('마감일은 달력에서 고른다 — 고르면 D-day를 보여주고, 다음을 누르면 초안을 만들고 챗봇으로 간다 (사용자 결정 2026-10-01)', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '임베디드시스템 과제');
    await fireEvent.press(screen.getByRole('button', { name: '마감일, 선택 안 함 (상시)' }));
    // 오늘(9/30)이 있는 달부터 열린다
    expect(screen.getByRole('header', { name: '2026년 9월' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('header', { name: '2026년 10월' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '10월 9일 금요일' }));
    expect(screen.queryByRole('header', { name: '2026년 10월' })).toBeNull();
    expect(screen.getByRole('button', { name: '마감일, 10월 9일 금요일' })).toBeOnTheScreen();
    expect(screen.getByText('D-9')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('설명 · 목표'), '3인 팀플');
    await fireEvent.changeText(screen.getByLabelText('결과물 형태'), '보고서, 발표자료');
    await fireEvent.changeText(screen.getByLabelText('기 진행사항'), '회로 구성 끝');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({ name: '임베디드시스템 과제', deadline: '2026-10-09', description: '3인 팀플', deliverable: '보고서, 발표자료', progress: '회로 구성 끝' });
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/chat');
  });

  it('달력: 오늘보다 앞선 날은 고를 수 없고, 이번 달보다 앞으로는 넘기지 않는다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '마감일, 선택 안 함 (상시)' }));
    expect(screen.getByRole('button', { name: '9월 29일 화요일' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '9월 30일 수요일, 오늘' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled();
  });

  it('고른 마감일을 지우면 마감 없음(상시)으로 등록된다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '알고리즘 스터디');
    await fireEvent.press(screen.getByRole('button', { name: '마감일, 선택 안 함 (상시)' }));
    await fireEvent.press(screen.getByRole('button', { name: '9월 30일 수요일, 오늘' }));
    await fireEvent.press(screen.getByRole('button', { name: '마감일, 9월 30일 수요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '마감 없음 (상시)' }));
    expect(screen.getByRole('button', { name: '마감일, 선택 안 함 (상시)' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({ name: '알고리즘 스터디', deadline: null });
  });

  it('프로젝트 색을 고른다 — 기본은 진행중 프로젝트가 아직 쓰지 않은 색', async () => {
    await renderWithProviders(<NewProjectScreen />);
    const group = screen.getByLabelText('프로젝트 색');
    // 진행중 프로젝트가 청록·자홍·보라를 써서 다음 색인 파랑(회색은 뺐다 — 사용자 결정 2026-10-01)
    await waitFor(() => expect(within(group).getByRole('radio', { name: '파랑' })).toBeSelected());
    expect(within(group).queryByRole('radio', { name: '회색' })).toBeNull();
    await fireEvent.press(within(group).getByRole('radio', { name: '초록' }));
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '캡스톤');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.color).toBe('green');
  });

  it('링크 첨부: 형식이 틀리면 오류, 맞으면 서버에 저장하고 목록에 추가, 지우면 서버에서도 지운다', async () => {
    attachments.addLink.mockResolvedValueOnce({ id: 11, kind: 'link', name: 'https://example.com/spec', url: 'https://example.com/spec' });
    attachments.deleteAttachment.mockResolvedValueOnce(undefined);
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'URL 첨부' }));
    const sheet = screen.getByLabelText('링크 첨부');
    await fireEvent.changeText(within(sheet).getByLabelText('링크 주소'), 'example');
    await fireEvent.press(within(sheet).getByRole('button', { name: '추가' }));
    expect(within(sheet).getByText('https://로 시작하는 주소를 입력해 주세요.')).toBeOnTheScreen();
    await fireEvent.changeText(within(sheet).getByLabelText('링크 주소'), 'https://example.com/spec');
    await fireEvent.press(within(sheet).getByRole('button', { name: '추가' }));
    expect(attachments.addLink).toHaveBeenCalledWith('https://example.com/spec');
    expect(await screen.findByText('https://example.com/spec')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'https://example.com/spec 첨부 삭제' }));
    expect(attachments.deleteAttachment).toHaveBeenCalledWith(11);
    await waitFor(() => expect(screen.queryByText('https://example.com/spec')).toBeNull());
  });

  it('파일·사진 첨부: 고르면 바로 서버에 올리고, 취소하면 아무것도 올리지 않는다. 서버가 거절하면 이유를 알린다', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ name: '명세서.pdf', uri: 'file:///cache/spec.pdf', mimeType: 'application/pdf' }] } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ fileName: 'capture.jpg', uri: 'file:///cache/capture.jpg', mimeType: 'image/jpeg' }] } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null } as never);
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ name: 'virus.exe', uri: 'file:///cache/v.exe', mimeType: null }] } as never);
    attachments.uploadAttachment
      .mockResolvedValueOnce({ id: 21, kind: 'file', name: '명세서.pdf', contentType: 'application/pdf', size: 10 })
      .mockResolvedValueOnce({ id: 22, kind: 'image', name: 'capture.jpg', contentType: 'image/jpeg', size: 10 })
      .mockRejectedValueOnce(new ApiError(400, 'UNSUPPORTED_FILE', '올릴 수 없는 파일 형식이에요. 실행 파일·영상은 받지 않아요.'));
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '파일 첨부' }));
    await fireEvent.press(screen.getByRole('button', { name: '캡처 첨부' }));
    await fireEvent.press(screen.getByRole('button', { name: '캡처 첨부' }));
    expect(await screen.findByText('명세서.pdf')).toBeOnTheScreen();
    expect(await screen.findByText('capture.jpg')).toBeOnTheScreen();
    expect(attachments.uploadAttachment).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: '파일 첨부' }));
    expect(await screen.findByText('올릴 수 없는 파일 형식이에요. 실행 파일·영상은 받지 않아요.')).toBeOnTheScreen();
    // 오류 알림은 완료 알림(검은 바탕·체크)과 구분된다
    expect(screen.getByTestId('toast')).toHaveStyle({ backgroundColor: colors.dangerText });

    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '캡스톤');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.attachments.map((a) => a.id)).toEqual([21, 22]);
  });
});

describe('등록 2/3 AI 챗봇 (서버가 Claude API 호출)', () => {
  it('등록 1단계에서 올린 첨부 id를 함께 보내 AI가 첨부를 읽게 한다', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'question', message: '명세서를 읽었어요. 팀원은 몇 명인가요?' });
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, attachments: [{ id: 21, kind: 'file', name: 'spec.pdf' }, { id: 22, kind: 'link', name: 'https://example.com', url: 'https://example.com' }] } });
    expect(await screen.findByText('명세서를 읽었어요. 팀원은 몇 명인가요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenCalledWith(expect.anything(), [], [21, 22]);
  });

  it('처음 들어오면 기본 정보로 첫 질문을 받고, 답하면 대화 전체를 보내 다음 질문을 받는다', async () => {
    chat.sendChat
      .mockResolvedValueOnce({ type: 'question', message: '선행 지식이 있나요?' })
      .mockResolvedValueOnce({ type: 'question', message: '누가 보고서를 맡나요?' });
    await renderWithProviders(<ChatScreen />, { draft });
    expect(await screen.findByText('선행 지식이 있나요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenCalledWith({ name: '임베디드시스템 과제', description: 'STM32', deadline: '2026-10-09', deliverable: '보고서', progress: '' }, [], []);
    // 질문 진행 표시(n/5)는 없앴다
    expect(screen.queryByText(/\/5$/)).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('답변 입력'), 'UART는 알아요');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('누가 보고서를 맡나요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenLastCalledWith(
      expect.anything(),
      [
        { role: 'assistant', text: '선행 지식이 있나요?' },
        { role: 'user', text: 'UART는 알아요' },
      ],
      [],
    );
  });

  it('AI가 작업을 제안하면 초안에 담고 가정을 보여준다 — 검토로 갈 수도, 대화로 계속 고칠 수도 있다', async () => {
    chat.sendChat
      .mockResolvedValueOnce({ type: 'tasks', message: '4개 작업을 만들었어요.', tasks: proposed, assumptions: ['팀원 3명으로 가정했어요'] })
      .mockResolvedValueOnce({ type: 'tasks', message: '발표자료를 나눴어요.', tasks: proposed, assumptions: [] });
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, chat: [{ role: 'assistant', text: '하루에 얼마나?' }] } });
    await fireEvent.changeText(screen.getByLabelText('답변 입력'), '하루 2시간');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('4개 작업을 만들었어요.')).toBeOnTheScreen();
    expect(screen.getByText('제안한 작업 4개')).toBeOnTheScreen();
    expect(screen.getByText('· 팀원 3명으로 가정했어요')).toBeOnTheScreen();
    expect(draftRef.current?.tasks.map((t) => t.title)).toEqual(proposed.map((t) => t.title));

    // 제안 뒤에도 대화로 의견을 보낼 수 있다 — 앞서 받은 제안을 함께 보낸다
    await fireEvent.changeText(screen.getByLabelText('답변 입력'), '발표자료는 너무 커');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('발표자료를 나눴어요.')).toBeOnTheScreen();
    const history = chat.sendChat.mock.calls.at(-1)![1];
    expect(history.at(-2)).toMatchObject({ role: 'assistant', text: '4개 작업을 만들었어요.' });
    expect(history.at(-2)!.tasks![1]).toEqual({ title: '설계 문서 작성', description: '블록도와 시퀀스', estimatedHours: 3, dependsOnTitle: '관련 개념 학습 (인터럽트)', prerequisite: false });
    expect(history.at(-1)).toEqual({ role: 'user', text: '발표자료는 너무 커' });

    await fireEvent.press(screen.getByRole('button', { name: '작업 검토하기' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/review');
  });

  it('AI가 답을 쓰는 동안 무엇을 하는 중인지 보여주고 입력을 막는다 (사용자 결정 2026-10-01)', async () => {
    let answer!: (r: { type: 'question'; message: string }) => void;
    chat.sendChat.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    await renderWithProviders(<ChatScreen />, { draft });
    // 첫 질문을 기다리는 중
    expect(await screen.findByText('프로젝트 정보를 읽고 첫 질문을 준비하고 있어요…')).toBeOnTheScreen();
    expect(screen.getByLabelText('AI가 답을 준비하는 중')).toBeOnTheScreen();
    expect(screen.getByLabelText('답변 입력')).toHaveProp('editable', false);
    await act(async () => answer({ type: 'question', message: '팀원은 몇 명인가요?' }));
    expect(await screen.findByText('팀원은 몇 명인가요?')).toBeOnTheScreen();
    expect(screen.queryByLabelText('AI가 답을 준비하는 중')).toBeNull();
    expect(screen.getByLabelText('답변 입력')).toHaveProp('editable', true);

    // 답을 보내면 다시 기다리는 중
    chat.sendChat.mockReturnValueOnce(new Promise(() => {}));
    await fireEvent.changeText(screen.getByLabelText('답변 입력'), '3명');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(screen.getByText('답변을 바탕으로 생각하고 있어요…')).toBeOnTheScreen();
  });

  it('AI 답의 **굵게** 표시를 기호 없이 굵은 글자로 보여준다', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'question', message: '1. **마감 기한**은 언제인가요?' });
    await renderWithProviders(<ChatScreen />, { draft });
    const bold = await screen.findByText('마감 기한');
    expect(bold).toHaveStyle({ fontFamily: 'Pretendard-Bold' });
    expect(screen.queryByText(/\*\*/)).toBeNull();
    expect(screen.getByLabelText('도우미: 1. 마감 기한은 언제인가요?')).toBeOnTheScreen();
  });

  it('지금 단계를 한 줄로 알려준다 — 질문에 답하는 중', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'question', message: '팀원은 몇 명인가요?' });
    await renderWithProviders(<ChatScreen />, { draft });
    expect(await screen.findByText('팀원은 몇 명인가요?')).toBeOnTheScreen();
    expect(screen.getByText('질문에 답하면 AI가 작업 목록을 제안해요.')).toBeOnTheScreen();
  });

  it('지금 단계를 한 줄로 알려준다 — 작업 목록을 받은 뒤', async () => {
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, chat: [{ role: 'assistant', text: '정리했어요.' }], tasks: draftTasks } });
    expect(screen.getByText('작업 목록을 받았어요. 고칠 점을 말하거나 검토로 넘어가세요.')).toBeOnTheScreen();
  });

  it('빈 답변은 보낼 수 없고, AI가 응답하지 않으면 다시 시도할 수 있다', async () => {
    chat.sendChat
      .mockRejectedValueOnce(new ApiError(503, 'AI_UNAVAILABLE', 'AI가 잠시 응답하지 않아요. 다시 시도해 주세요.'))
      .mockResolvedValueOnce({ type: 'question', message: '선행 지식이 있나요?' });
    await renderWithProviders(<ChatScreen />, { draft });
    expect(await screen.findByText('AI가 잠시 응답하지 않아요. 다시 시도해 주세요.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('선행 지식이 있나요?')).toBeOnTheScreen();
  });
});

describe('등록 3/3 작업 검토', () => {
  const withTasks = { ...draft, tasks: draftTasks };

  it('제안된 작업 수와 총 시간, 선행 학습·선행 연결을 보여준다', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    expect(screen.getByText('4개')).toBeOnTheScreen();
    expect(screen.getByText('총 11h')).toBeOnTheScreen();
    expect(screen.getByText('선행 학습')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '선행 연결 해제: 관련 개념 학습 완료 후' })).toBeOnTheScreen();
  });

  it('작업 이름은 길어도 줄바꿈해서 전부 보인다 (사용자 결정 2026-10-01)', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    const name = screen.getByLabelText('1번 작업 이름');
    expect(name.props.multiline).toBe(true);
    expect(name.props.numberOfLines).toBeUndefined();
  });

  it('작업을 누르면 세부 설명과 AI가 역산한 마감일(참고)을 펼쳐 보여준다', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    expect(screen.queryByText('NVIC·EXTI 개념 정리, 예제 1개 실행')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '1번 작업 설명 보기' }));
    expect(screen.getByText('NVIC·EXTI 개념 정리, 예제 1개 실행')).toBeOnTheScreen();
    expect(screen.getByText('AI 제안 마감 10/3 (참고)')).toBeOnTheScreen();
  });

  it('직접 고친 목록을 AI에게 보내 다시 정리받는다 (대화 기록과 함께)', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'tasks', message: '반영해서 다시 정리했어요.', tasks: proposed.slice(0, 2), assumptions: [] });
    const history = [{ role: 'assistant' as const, text: '팀원은?' }, { role: 'user' as const, text: '3명' }];
    await renderWithProviders(<ReviewScreen />, { draft: { ...withTasks, chat: history } });
    await fireEvent.press(screen.getByRole('button', { name: '4번 작업 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: 'AI에게 다시 정리 요청' }));
    const [, sent] = chat.sendChat.mock.calls.at(-1)!;
    expect(sent.slice(0, 2)).toEqual(history);
    expect(sent.at(-1)!.role).toBe('user');
    expect(sent.at(-1)!.tasks!.map((t) => t.title)).toEqual(['관련 개념 학습 (인터럽트)', '설계 문서 작성', '보고서 초안 작성']);
    expect(await screen.findByText('반영해서 다시 정리했어요.')).toBeOnTheScreen();
    expect(draftRef.current?.tasks).toHaveLength(2);
  });

  it('이름·시간을 고치고, 삭제·추가하고, 선행 연결을 토글한다', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    await fireEvent.changeText(screen.getByLabelText('1번 작업 이름'), '인터럽트 개념 학습');
    await fireEvent.press(screen.getByRole('button', { name: '1번 작업 시간 늘리기' }));
    await fireEvent.press(screen.getByRole('button', { name: '4번 작업 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '작업 직접 추가' }));
    await fireEvent.press(screen.getByRole('button', { name: '선행 연결: 보고서 초안 작성 완료 후' }));
    const tasks = draftRef.current!.tasks;
    expect(tasks.map((t) => [t.title, t.estimatedHours])).toEqual([
      ['인터럽트 개념 학습', 2.5],
      ['설계 문서 작성', 3],
      ['보고서 초안 작성', 4],
      ['새 작업', 1],
    ]);
    expect(tasks[3].dependsOnKey).toBe('k3');
  });

  it('작업 순서를 위아래로 바꾼다 — 선행 작업보다 앞으로 가는 버튼은 막혀 있다', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    // 2번(설계 문서)은 1번(개념 학습)이 선행이라 위로 못 간다
    expect(screen.getByRole('button', { name: '2번 작업 위로' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1번 작업 아래로' })).toBeDisabled();
    // 4번(발표자료)은 선행이 없어 3번 위로 올라간다
    await fireEvent.press(screen.getByRole('button', { name: '4번 작업 위로' }));
    expect(draftRef.current!.tasks.map((t) => t.key)).toEqual(['k1', 'k2', 'k4', 'k3']);
    expect(screen.getByRole('button', { name: '1번 작업 위로' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '4번 작업 아래로' })).toBeDisabled();
  });

  it('등록 완료하면 서버에 초안(작업·색·첨부 id)을 보내고, 알림 후 새 프로젝트 상세로 간다', async () => {
    const s = sampleSchedule(TEST_TODAY);
    projects.createProject.mockResolvedValueOnce({ project: { ...s.projects[0], id: 9, deliverable: '', progress: '', tasks: [], attachments: [] }, lateCount: 1 });
    await renderWithProviders(<ReviewScreen />, { draft: { ...withTasks, attachments: [{ id: 21, kind: 'file', name: 'spec.pdf' }] } });
    await fireEvent.press(screen.getByRole('button', { name: '등록 완료' }));
    expect(projects.createProject).toHaveBeenCalledWith({
      name: '임베디드시스템 과제',
      description: 'STM32',
      deadline: '2026-10-09',
      color: 'violet',
      deliverable: '보고서',
      progress: '',
      tasks: proposed.map(({ key, title, description, estimatedHours, dependsOnKey, prerequisite }) => ({ key, title, description, estimatedHours, dependsOnKey, prerequisite })),
      attachmentIds: [21],
    });
    expect(await screen.findByText('임베디드시스템 과제가 등록됐어요 · 마감 안에 끝내기 빠듯한 작업 1개')).toBeOnTheScreen();
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith('/projects/9', { withAnchor: true });
    await act(async () => {});
    expect(draftRef.current).toBeNull();
  });

  it('등록에 실패하면 이유를 알리고 초안을 지키고 머문다', async () => {
    projects.createProject.mockRejectedValueOnce(new ApiError(400, 'VALIDATION_FAILED', '입력값을 확인해 주세요.'));
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    await fireEvent.press(screen.getByRole('button', { name: '등록 완료' }));
    expect(await screen.findByText('입력값을 확인해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(draftRef.current?.tasks).toHaveLength(4);
  });
});

describe('AI에게 재요청 (사용자 결정 2026-10-02 — 기존 프로젝트의 미완료 작업을 다시 나눈다)', () => {
  const s = sampleSchedule(TEST_TODAY);
  const existing = {
    ...s.projects[0],
    id: 1,
    name: '임베디드AC과제 중간발표',
    description: '중간발표와 결과물 제출',
    deadline: '2026-10-11',
    color: 'blue' as const,
    deliverable: '발표자료, 보고서v2, 시연 영상',
    progress: '주제발표 진행',
    tasks: [
      { ...s.tasks[0], id: 101, projectId: 1, title: '주제발표 자료 정리', done: true },
      { ...s.tasks[1], id: 102, projectId: 1, title: '시연 영상 촬영', done: false },
    ],
    attachments: [{ id: 31, kind: 'file' as const, name: '주제발표-보고서-v1.pdf' }],
  };

  it('기본 정보·색·첨부를 기존 프로젝트에서 채워 두고, 다음을 누르면 초안에 프로젝트 id와 끝낸 작업을 담는다', async () => {
    mockParams.current = { projectId: '1' };
    projects.getProject.mockResolvedValue(existing);
    await renderWithProviders(<NewProjectScreen />);
    expect(await screen.findByDisplayValue('임베디드AC과제 중간발표')).toBeOnTheScreen();
    expect(projects.getProject).toHaveBeenCalledWith(1);
    expect(screen.getByDisplayValue('중간발표와 결과물 제출')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('발표자료, 보고서v2, 시연 영상')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('주제발표 진행')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '마감일, 10월 11일 일요일' })).toBeOnTheScreen();
    expect(screen.getByText('주제발표-보고서-v1.pdf')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({
      projectId: 1,
      completedTasks: ['주제발표 자료 정리'],
      name: '임베디드AC과제 중간발표',
      deadline: '2026-10-11',
      color: 'blue',
      deliverable: '발표자료, 보고서v2, 시연 영상',
      progress: '주제발표 진행',
      attachments: [{ id: 31 }],
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/chat');
  });

  it('챗봇에 끝낸 작업을 함께 보내 다시 제안하지 않게 한다', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'question', message: '남은 기간은요?' });
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, projectId: 1, completedTasks: ['주제발표 자료 정리'] } });
    expect(await screen.findByText('남은 기간은요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenCalledWith(expect.objectContaining({ completedTasks: ['주제발표 자료 정리'] }), [], []);
  });

  it('등록 완료하면 새로 만들지 않고 기존 프로젝트의 작업을 바꾼 뒤 그 프로젝트 상세로 간다', async () => {
    projects.replaceProjectTasks.mockResolvedValueOnce({ project: existing, lateCount: 0 });
    await renderWithProviders(<ReviewScreen />, { draft: { ...draft, tasks: draftTasks, projectId: 1, completedTasks: ['주제발표 자료 정리'] } });
    await fireEvent.press(screen.getByRole('button', { name: '등록 완료' }));
    expect(projects.createProject).not.toHaveBeenCalled();
    expect(projects.replaceProjectTasks).toHaveBeenCalledWith(1, expect.objectContaining({ name: '임베디드시스템 과제', deliverable: '보고서', tasks: expect.any(Array), attachmentIds: [] }));
    expect(await screen.findByText('임베디드시스템 과제의 작업을 다시 나눴어요')).toBeOnTheScreen();
    expect(mockRouter.navigate).toHaveBeenCalledWith('/projects/1', { withAnchor: true });
  });
});
