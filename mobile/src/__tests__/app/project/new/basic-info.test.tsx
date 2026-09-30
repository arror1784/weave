import { fireEvent, screen } from '@testing-library/react-native';

import NewProjectScreen from '@/app/project/new/index';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('프로젝트 기본 정보 등록 화면', () => {
  it('프로젝트 이름이 없으면 다음으로 가지 않는다', async () => {
    await renderWithStore(<NewProjectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('프로젝트 이름을 입력해 주세요.')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('입력한 정보로 등록 초안을 만들고 챗봇으로 이동한다', async () => {
    await renderWithStore(<NewProjectScreen />);
    await fireEvent.changeText(screen.getByLabelText('프로젝트 이름'), '임베디드 팀프로젝트');
    await fireEvent.changeText(screen.getByLabelText('내용 (주제·제출 안내·공지 등)'), '10월 말 발표');
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));

    expect(storeRef.current?.draft).toMatchObject({ name: '임베디드 팀프로젝트', description: '10월 말 발표' });
    expect(mockRouter.push).toHaveBeenCalledWith('/project/new/chat');
  });
});
