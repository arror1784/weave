import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithStore, storeRef } from '@/test-utils/render';

import { ProjectCompleteDialog } from './ProjectCompleteDialog';

describe('프로젝트 완료 모달', () => {
  it('마지막 작업을 끝낸 프로젝트가 있으면 완료 여부를 묻고, 완료하면 완료 상태가 된다', async () => {
    await renderWithStore(<ProjectCompleteDialog />, { completionPrompt: 'p-embedded' });
    expect(screen.getByRole('header', { name: '프로젝트가 완료되었습니까?' })).toBeOnTheScreen();
    expect(screen.getByText('임베디드시스템 과제의 작업을 모두 끝냈어요.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(storeRef.current?.projects.find((p) => p.id === 'p-embedded')?.status).toBe('done');
    expect(screen.getByText('임베디드시스템 과제를 완료했어요')).toBeOnTheScreen();
  });

  it('아직이라고 하면 진행중으로 둔다', async () => {
    await renderWithStore(<ProjectCompleteDialog />, { completionPrompt: 'p-embedded' });
    await fireEvent.press(screen.getByRole('button', { name: '아직이에요' }));
    expect(storeRef.current?.completionPrompt).toBeNull();
    expect(storeRef.current?.projects.find((p) => p.id === 'p-embedded')?.status).toBe('active');
  });

  it('물어볼 프로젝트가 없으면 보이지 않는다', async () => {
    await renderWithStore(<ProjectCompleteDialog />);
    expect(screen.queryByText('프로젝트가 완료되었습니까?')).toBeNull();
  });
});
