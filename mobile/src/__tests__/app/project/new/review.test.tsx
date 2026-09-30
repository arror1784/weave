import { fireEvent, screen } from '@testing-library/react-native';

import ReviewScreen from '@/app/project/new/review';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

const draft = {
  name: '임베디드 팀프로젝트',
  description: '',
  tasks: [
    { title: '주제 선정', estimatedHours: null },
    { title: '부품 구매', estimatedHours: 3 },
  ],
};

describe('작업 태스크 검토 화면', () => {
  it('제안된 작업을 순서대로 보여준다', async () => {
    await renderWithStore(<ReviewScreen />, { draft });
    expect(screen.getByLabelText('1번 작업 이름')).toHaveDisplayValue('주제 선정');
    expect(screen.getByLabelText('2번 작업 이름')).toHaveDisplayValue('부품 구매');
    expect(screen.getByLabelText('2번 예상 소요 시간 (시간)')).toHaveDisplayValue('3');
  });

  it('작업을 수정·삭제·추가할 수 있다', async () => {
    await renderWithStore(<ReviewScreen />, { draft });
    await fireEvent.changeText(screen.getByLabelText('1번 작업 이름'), '주제 확정');
    await fireEvent.press(screen.getByRole('button', { name: '2번 작업 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '작업 추가' }));

    expect(storeRef.current?.draft?.tasks).toEqual([
      { title: '주제 확정', estimatedHours: null },
      { title: '', estimatedHours: null },
    ]);
  });

  it('이름이 빈 작업이 있으면 등록하지 않는다', async () => {
    await renderWithStore(<ReviewScreen />, { draft: { ...draft, tasks: [{ title: '', estimatedHours: null }] } });
    await fireEvent.press(screen.getByRole('button', { name: '프로젝트 등록' }));
    expect(screen.getByText('이름이 비어 있는 작업이 있어요.')).toBeOnTheScreen();
    expect(storeRef.current?.draft).not.toBeNull();
  });

  it('등록하면 프로젝트가 추가되고 오늘의 일정으로 돌아간다', async () => {
    await renderWithStore(<ReviewScreen />, { draft });
    await fireEvent.press(screen.getByRole('button', { name: '프로젝트 등록' }));

    expect(storeRef.current?.draft).toBeNull();
    expect(storeRef.current?.projects.filter((p) => p.name === '임베디드 팀프로젝트').length).toBe(2);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});
