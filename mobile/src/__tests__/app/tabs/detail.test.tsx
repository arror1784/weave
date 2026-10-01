import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import * as attachmentsApi from '@/api/attachments';

import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProjectDetail } from '@/api/types';
import ProjectDetailScreen from '@/app/(tabs)/projects/[id]';
import { sampleSchedule } from '@/test-utils/fixtures';
import { completionRef, renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
jest.mock('@/api/attachments');
const api = jest.mocked(projectsApi);
const attachments = jest.mocked(attachmentsApi);

function embedded(): ProjectDetail {
  const s = sampleSchedule(TEST_TODAY);
  return { ...s.projects[0], deliverable: '', progress: '', tasks: s.tasks.filter((t) => t.projectId === 1), attachments: [] };
}

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  mockParams.current = { id: '1' };
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
  api.getProject.mockResolvedValue(embedded());
});

describe('프로젝트 상세', () => {
  it('서버에서 받은 프로젝트 정보·진행률·D-day를 보여준다', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    expect(await screen.findByRole('header', { name: '임베디드시스템 과제' })).toBeOnTheScreen();
    expect(api.getProject).toHaveBeenCalledWith(1);
    expect(screen.getByText('1/5 · 20%')).toBeOnTheScreen();
    expect(screen.getByText('D-9')).toBeOnTheScreen();
  });

  it('태스크 탭: 선행 작업을 보여주고 체크하면 서버에 완료로 보낸다', async () => {
    const task = { ...embedded().tasks[1], done: true };
    api.setTaskDone.mockResolvedValueOnce({ task, projectAllDone: false });
    await renderWithProviders(<ProjectDetailScreen />);
    expect(await screen.findByText('선행: 설계 문서 작성 필요')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: '설계 문서 작성 완료' }));
    expect(api.setTaskDone).toHaveBeenCalledWith(102, true);
    expect(completionRef.current).toBeNull();
  });

  it('마지막 작업을 끝내면 프로젝트 완료 여부를 묻는다', async () => {
    api.setTaskDone.mockResolvedValueOnce({ task: { ...embedded().tasks[4], done: true }, projectAllDone: true });
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: '발표자료 제작 완료' }));
    await waitFor(() => expect(completionRef.current).toEqual({ projectId: 1, name: '임베디드시스템 과제', taskId: 105 }));
  });

  it('작업을 누르면 세부 설명을 펼쳐 보여준다', async () => {
    api.getProject.mockResolvedValue({ ...embedded(), tasks: embedded().tasks.map((t) => (t.id === 102 ? { ...t, description: '블록도와 시퀀스 다이어그램' } : t)) });
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^설계 문서 작성, 3시간/ }));
    expect(screen.getByText('블록도와 시퀀스 다이어그램')).toBeOnTheScreen();
  });

  it('등록된 작업은 고칠 수 없다: 작업 수정·작업 추가가 없다 (완료 체크만 가능)', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await screen.findByRole('header', { name: '임베디드시스템 과제' });
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '작업 추가' })).toBeNull();
  });

  it('프로젝트 색을 바꾸면 서버에 보낸다', async () => {
    api.updateProject.mockResolvedValueOnce({ ...embedded(), color: 'blue' });
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '프로젝트 색 바꾸기' }));
    const sheet = screen.getByLabelText('프로젝트 색');
    expect(within(sheet).getByRole('radio', { name: '청록' })).toBeSelected();
    await fireEvent.press(within(sheet).getByRole('radio', { name: '파랑' }));
    expect(api.updateProject).toHaveBeenCalledWith(1, { color: 'blue' });
    expect(screen.queryByLabelText('프로젝트 색')).toBeNull();
  });

  it('AI에게 재요청하면 이 프로젝트의 정보를 가지고 등록 흐름으로 간다 (사용자 결정 2026-10-02)', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'AI에게 재요청' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new?projectId=1');
  });

  it('완료한 프로젝트에는 AI에게 재요청 버튼이 없다 (완료한 프로젝트는 되돌리지 않는다)', async () => {
    api.getProject.mockResolvedValue({ ...embedded(), status: 'done' });
    await renderWithProviders(<ProjectDetailScreen />);
    expect(await screen.findByRole('header', { name: '임베디드시스템 과제' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'AI에게 재요청' })).toBeNull();
  });

  it('일정 탭: 간트 막대와 밀린 작업이 뒤 작업에 주는 영향을 알려준다', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: '일정' }));
    expect(screen.getByLabelText(/^설계 문서 작성, 9\/29부터 1일, 3시간, 밀림/)).toBeOnTheScreen();
    expect(screen.getByText(/설계 문서 작성이 밀려서 보고서 v2 초안 작성 시작이 늦어질 수 있어요/)).toBeOnTheScreen();
  });

  it('첨부 목록을 보여주고, 파일은 내려받고 링크는 연다', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    attachments.downloadAttachment.mockResolvedValueOnce(undefined);
    api.getProject.mockResolvedValue({
      ...embedded(),
      attachments: [
        { id: 21, kind: 'file', name: '명세서.pdf', contentType: 'application/pdf', size: 1000 },
        { id: 22, kind: 'link', name: 'https://example.com/spec', url: 'https://example.com/spec' },
      ],
    });
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '명세서.pdf 내려받기' }));
    expect(attachments.downloadAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: 21 }));
    await fireEvent.press(screen.getByRole('button', { name: 'https://example.com/spec 열기' }));
    expect(openURL).toHaveBeenCalledWith('https://example.com/spec');
  });

  it('첨부가 없으면 참고자료 구역을 보여주지 않는다', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await screen.findByRole('header', { name: '임베디드시스템 과제' });
    expect(screen.queryByText('참고자료')).toBeNull();
  });

  it('없는(또는 남의) 프로젝트면 안내를 보여준다', async () => {
    api.getProject.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', '프로젝트를 찾을 수 없어요.'));
    await renderWithProviders(<ProjectDetailScreen />);
    expect(await screen.findByText('프로젝트를 찾을 수 없어요.')).toBeOnTheScreen();
  });

  it('프로젝트 삭제: 확인을 받은 뒤 서버에 삭제를 요청하고 목록으로 돌아가 알린다 (사용자 결정 2026-10-01 — 상시 프로젝트를 끝낼 때)', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    api.deleteProject.mockResolvedValueOnce(undefined);
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '프로젝트 삭제' }));
    expect(api.deleteProject).not.toHaveBeenCalled();
    const [title, , buttons] = alert.mock.calls.at(-1)!;
    expect(title).toBe('프로젝트 삭제');
    await act(async () => buttons!.find((b) => b.style === 'destructive')!.onPress!());
    expect(api.deleteProject).toHaveBeenCalledWith(1);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await screen.findByText('임베디드시스템 과제를 삭제했어요')).toBeOnTheScreen();
  });

  it('프로젝트 삭제를 취소하면 아무것도 지우지 않는다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '프로젝트 삭제' }));
    const cancel = alert.mock.calls.at(-1)![2]!.find((b) => b.style === 'cancel')!;
    await act(async () => cancel.onPress?.());
    expect(api.deleteProject).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
