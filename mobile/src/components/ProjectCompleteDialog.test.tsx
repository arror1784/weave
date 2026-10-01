import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import { completionRef, renderWithProviders } from '@/test-utils/render';

import { ProjectCompleteDialog } from './ProjectCompleteDialog';

jest.mock('@/api/projects');
const api = jest.mocked(projectsApi);
const pending = { projectId: 1, name: '임베디드시스템 과제' };

beforeEach(() => jest.clearAllMocks());

describe('프로젝트 완료 모달', () => {
  it('마지막 작업을 끝낸 프로젝트가 있으면 완료 여부를 묻고, 완료하면 서버에 완료로 바꾼다', async () => {
    api.updateProject.mockResolvedValueOnce({ id: 1, name: '임베디드시스템 과제', description: '', deadline: null, status: 'done', color: 'teal', tasks: [], attachments: [] });
    await renderWithProviders(<ProjectCompleteDialog />, { completion: pending });
    expect(screen.getByRole('header', { name: '프로젝트가 완료되었습니까?' })).toBeOnTheScreen();
    expect(screen.getByText('임베디드시스템 과제의 작업을 모두 끝냈어요.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(api.updateProject).toHaveBeenCalledWith(1, { status: 'done' });
    expect(await screen.findByText('임베디드시스템 과제를 완료했어요')).toBeOnTheScreen();
    expect(completionRef.current).toBeNull();
  });

  it('아직이라고 하면 서버에 보내지 않고 닫는다', async () => {
    await renderWithProviders(<ProjectCompleteDialog />, { completion: pending });
    await fireEvent.press(screen.getByRole('button', { name: '아직이에요' }));
    await waitFor(() => expect(completionRef.current).toBeNull());
    expect(api.updateProject).not.toHaveBeenCalled();
  });

  it('물어볼 프로젝트가 없으면 보이지 않는다', async () => {
    await renderWithProviders(<ProjectCompleteDialog />);
    expect(screen.queryByText('프로젝트가 완료되었습니까?')).toBeNull();
  });
});
