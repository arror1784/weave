import { fireEvent, screen } from '@testing-library/react-native';

import ChatScreen from '@/app/project/new/chat';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

const draft = { name: '임베디드 팀프로젝트', description: '', tasks: [] };

async function answer(text: string) {
  await fireEvent.changeText(screen.getByLabelText('답변 입력'), text);
  await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
}

describe('챗봇 화면 (목업)', () => {
  it('첫 질문을 보여준다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    expect(screen.getByText('어떤 프로젝트인가요?')).toBeOnTheScreen();
  });

  it('답하면 내 답변과 다음 질문이 이어진다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    await answer('임베디드 팀프로젝트');
    expect(screen.getByText('임베디드 팀프로젝트')).toBeOnTheScreen();
    expect(screen.getByText('팀원은 몇 명인가요?')).toBeOnTheScreen();
  });

  it('빈 답변은 보내지 않는다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
  });

  it('질문에 모두 답하면 제안된 작업을 초안에 넣고 검토로 이동할 수 있다', async () => {
    await renderWithStore(<ChatScreen />, { draft });
    await answer('임베디드 팀프로젝트');
    await answer('4명');
    await answer('없어');

    expect(storeRef.current?.draft?.tasks.map((t) => t.title)).toEqual(['주제 선정', '아이디어 선정', '부품 구매', '펌웨어 개발']);
    await fireEvent.press(screen.getByRole('button', { name: '작업 단계 검토하기' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/review');
  });
});
