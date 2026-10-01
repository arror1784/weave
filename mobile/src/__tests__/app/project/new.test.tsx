import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import * as attachmentsApi from '@/api/attachments';
import * as chatApi from '@/api/chat';
import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProposedTask } from '@/api/types';
import ChatScreen from '@/app/project/new/chat';
import NewProjectScreen from '@/app/project/new/index';
import ReviewScreen from '@/app/project/new/review';
import type { Draft } from '@/state/draft';
import { sampleSchedule } from '@/test-utils/fixtures';
import { draftRef, renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

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

const draft: Draft = { name: '임베디드시스템 과제', description: 'STM32', deadline: '2026-10-09', color: 'gray', attachments: [], chat: [], tasks: [] };
const proposed: ProposedTask[] = [
  { key: 'k1', title: '관련 개념 학습 (인터럽트)', estimatedHours: 2, dependsOnKey: null, prerequisite: true },
  { key: 'k2', title: '설계 문서 작성', estimatedHours: 3, dependsOnKey: 'k1', prerequisite: false },
  { key: 'k3', title: '보고서 초안 작성', estimatedHours: 4, dependsOnKey: 'k2', prerequisite: false },
  { key: 'k4', title: '발표자료 제작', estimatedHours: 2, dependsOnKey: null, prerequisite: false },
];

describe('등록 1/3 기본 정보', () => {
  it('단계 표시와 입력칸을 보여준다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    expect(screen.getByText('1 / 3')).toBeOnTheScreen();
    for (const label of ['프로젝트명', '마감일', '설명 · 목표']) expect(screen.getByLabelText(label)).toBeOnTheScreen();
  });

  it('프로젝트명이 없거나 마감일 형식이 틀리면 다음으로 가지 않는다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('마감일'), '10월 9일');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('프로젝트명을 입력해 주세요.')).toBeOnTheScreen();
    expect(screen.getByText('2026-10-09처럼 입력해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('마감일을 입력하면 D-day를 보여주고, 다음을 누르면 초안을 만들고 챗봇으로 간다', async () => {
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '임베디드시스템 과제');
    await fireEvent.changeText(screen.getByLabelText('마감일'), '2026-10-09');
    expect(await screen.findByText('D-9')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('설명 · 목표'), '3인 팀플');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current).toMatchObject({ name: '임베디드시스템 과제', deadline: '2026-10-09', description: '3인 팀플' });
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/chat');
  });

  it('프로젝트 색을 고른다 — 기본은 진행중 프로젝트가 아직 쓰지 않은 색', async () => {
    await renderWithProviders(<NewProjectScreen />);
    const group = screen.getByLabelText('프로젝트 색');
    await waitFor(() => expect(within(group).getByRole('radio', { name: '회색' })).toBeSelected());
    await fireEvent.press(within(group).getByRole('radio', { name: '파랑' }));
    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '캡스톤');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.color).toBe('blue');
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
      .mockRejectedValueOnce(new ApiError(400, 'UNSUPPORTED_FILE', 'PDF·이미지·Office·한글·txt 파일만 올릴 수 있어요.'));
    await renderWithProviders(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '파일 첨부' }));
    await fireEvent.press(screen.getByRole('button', { name: '캡처 첨부' }));
    await fireEvent.press(screen.getByRole('button', { name: '캡처 첨부' }));
    expect(await screen.findByText('명세서.pdf')).toBeOnTheScreen();
    expect(await screen.findByText('capture.jpg')).toBeOnTheScreen();
    expect(attachments.uploadAttachment).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: '파일 첨부' }));
    expect(await screen.findByText('PDF·이미지·Office·한글·txt 파일만 올릴 수 있어요.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('프로젝트명'), '캡스톤');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(draftRef.current?.attachments.map((a) => a.id)).toEqual([21, 22]);
  });
});

describe('등록 2/3 AI 챗봇 (서버가 Claude API 호출)', () => {
  it('등록 1단계에서 올린 첨부 id를 함께 보내 AI가 첨부를 읽게 한다', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'question', message: '명세서를 읽었어요. 팀원은 몇 명인가요?', questionNumber: 1, totalQuestions: 5 });
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, attachments: [{ id: 21, kind: 'file', name: 'spec.pdf' }, { id: 22, kind: 'link', name: 'https://example.com', url: 'https://example.com' }] } });
    expect(await screen.findByText('명세서를 읽었어요. 팀원은 몇 명인가요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenCalledWith(expect.anything(), [], [21, 22]);
  });

  it('처음 들어오면 기본 정보로 첫 질문을 받고, 답하면 대화 전체를 보내 다음 질문을 받는다', async () => {
    chat.sendChat
      .mockResolvedValueOnce({ type: 'question', message: '선행 지식이 있나요?', questionNumber: 1, totalQuestions: 5 })
      .mockResolvedValueOnce({ type: 'question', message: '누가 보고서를 맡나요?', questionNumber: 2, totalQuestions: 5 });
    await renderWithProviders(<ChatScreen />, { draft });
    expect(await screen.findByText('선행 지식이 있나요?')).toBeOnTheScreen();
    expect(chat.sendChat).toHaveBeenCalledWith({ name: '임베디드시스템 과제', description: 'STM32', deadline: '2026-10-09' }, [], []);
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

  it('AI가 작업을 제안하면 초안에 담고 검토로 갈 수 있다', async () => {
    chat.sendChat.mockResolvedValueOnce({ type: 'tasks', message: '4개 작업을 만들었어요.', questionNumber: 3, totalQuestions: 5, tasks: proposed });
    await renderWithProviders(<ChatScreen />, { draft: { ...draft, chat: [{ role: 'assistant', text: '하루에 얼마나?' }] } });
    await fireEvent.changeText(screen.getByLabelText('답변 입력'), '하루 2시간');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('4개 작업을 만들었어요.')).toBeOnTheScreen();
    expect(draftRef.current?.tasks).toHaveLength(4);
    await fireEvent.press(screen.getByRole('button', { name: '작업 검토하기' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/review');
  });

  it('빈 답변은 보낼 수 없고, AI가 응답하지 않으면 다시 시도할 수 있다', async () => {
    chat.sendChat
      .mockRejectedValueOnce(new ApiError(503, 'AI_UNAVAILABLE', 'AI가 잠시 응답하지 않아요. 다시 시도해 주세요.'))
      .mockResolvedValueOnce({ type: 'question', message: '선행 지식이 있나요?', questionNumber: 1, totalQuestions: 5 });
    await renderWithProviders(<ChatScreen />, { draft });
    expect(await screen.findByText('AI가 잠시 응답하지 않아요. 다시 시도해 주세요.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('선행 지식이 있나요?')).toBeOnTheScreen();
  });
});

describe('등록 3/3 작업 검토', () => {
  const withTasks = { ...draft, tasks: proposed };

  it('제안된 작업 수와 총 시간, 선행 학습·선행 연결을 보여준다', async () => {
    await renderWithProviders(<ReviewScreen />, { draft: withTasks });
    expect(screen.getByText('4개')).toBeOnTheScreen();
    expect(screen.getByText('총 11h')).toBeOnTheScreen();
    expect(screen.getByText('선행 학습')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '선행 연결 해제: 관련 개념 학습 완료 후' })).toBeOnTheScreen();
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

  it('등록 완료하면 서버에 초안(작업·색·첨부 id)을 보내고, 알림 후 새 프로젝트 상세로 간다', async () => {
    const s = sampleSchedule(TEST_TODAY);
    projects.createProject.mockResolvedValueOnce({ project: { ...s.projects[0], id: 9, tasks: [], attachments: [] }, lateCount: 1 });
    await renderWithProviders(<ReviewScreen />, { draft: { ...withTasks, attachments: [{ id: 21, kind: 'file', name: 'spec.pdf' }] } });
    await fireEvent.press(screen.getByRole('button', { name: '등록 완료' }));
    expect(projects.createProject).toHaveBeenCalledWith({
      name: '임베디드시스템 과제',
      description: 'STM32',
      deadline: '2026-10-09',
      color: 'gray',
      tasks: proposed,
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
