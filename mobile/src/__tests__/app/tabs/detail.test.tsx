import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import * as projectsApi from '@/api/projects';
import type { ProjectDetail } from '@/api/types';
import ProjectDetailScreen from '@/app/(tabs)/projects/[id]';
import { sampleSchedule } from '@/test-utils/fixtures';
import { completionRef, renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);

function embedded(): ProjectDetail {
  const s = sampleSchedule(TEST_TODAY);
  return { ...s.projects[0], tasks: s.tasks.filter((t) => t.projectId === 1), attachments: [] };
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
    await waitFor(() => expect(completionRef.current).toEqual({ projectId: 1, name: '임베디드시스템 과제' }));
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

  it('AI에게 재요청하면 등록 흐름으로 간다', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'AI에게 재요청' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new');
  });

  it('일정 탭: 간트 막대와 밀린 작업이 뒤 작업에 주는 영향을 알려준다', async () => {
    await renderWithProviders(<ProjectDetailScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: '일정' }));
    expect(screen.getByLabelText(/^설계 문서 작성, 9\/29부터 1일, 3시간, 밀림/)).toBeOnTheScreen();
    expect(screen.getByText(/설계 문서 작성이 밀려서 보고서 v2 초안 작성 시작이 늦어질 수 있어요/)).toBeOnTheScreen();
  });

  it('없는(또는 남의) 프로젝트면 안내를 보여준다', async () => {
    api.getProject.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', '프로젝트를 찾을 수 없어요.'));
    await renderWithProviders(<ProjectDetailScreen />);
    expect(await screen.findByText('프로젝트를 찾을 수 없어요.')).toBeOnTheScreen();
  });
});
