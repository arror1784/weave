import { act, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import TaskEditScreen from '@/app/project/[id]/task/[taskId]';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
  mockParams.current = { id: 'p-embedded', taskId: 't-parts' };
});

describe('태스크 수정·삭제 화면', () => {
  it('제목과 소요 시간을 수정해 저장한다', async () => {
    await renderWithStore(<TaskEditScreen />);
    await fireEvent.changeText(screen.getByLabelText('작업 이름'), '센서·보드 부품 구매');
    await fireEvent.changeText(screen.getByLabelText('예상 소요 시간 (시간)'), '3');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));

    expect(storeRef.current?.tasks.find((t) => t.id === 't-parts')).toMatchObject({ title: '센서·보드 부품 구매', estimatedHours: 3 });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('작업 이름이 비어 있으면 저장하지 않고 오류를 보여준다', async () => {
    await renderWithStore(<TaskEditScreen />);
    await fireEvent.changeText(screen.getByLabelText('작업 이름'), '  ');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByText('작업 이름을 입력해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('소요 시간이 숫자가 아니면 오류를 보여준다', async () => {
    await renderWithStore(<TaskEditScreen />);
    await fireEvent.changeText(screen.getByLabelText('예상 소요 시간 (시간)'), '많이');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('0보다 큰 숫자로 입력해 주세요.')).toBeOnTheScreen();
  });

  it('선행 작업을 보여준다', async () => {
    await renderWithStore(<TaskEditScreen />);
    expect(screen.getByText('아이디어 선정')).toBeOnTheScreen();
  });

  it('삭제는 확인을 받은 뒤에 한다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithStore(<TaskEditScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '작업 삭제' }));

    expect(storeRef.current?.tasks.some((t) => t.id === 't-parts')).toBe(true);
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons.find((b) => b.style === 'destructive')!.onPress!());

    expect(storeRef.current?.tasks.some((t) => t.id === 't-parts')).toBe(false);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
