import { fireEvent, screen } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('로그인 화면', () => {
  it('이메일·비밀번호를 비우고 로그인하면 각 입력칸 아래에 오류를 보여준다', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

    expect(screen.getByText('이메일을 입력해 주세요.')).toBeOnTheScreen();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeOnTheScreen();
    expect(storeRef.current?.session).toBeNull();
  });

  it('이메일 형식이 틀리면 오류를 보여준다', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

    expect(screen.getByText('이메일 형식이 올바르지 않아요.')).toBeOnTheScreen();
  });

  it('올바르게 입력하면 로그인된다 (목업)', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

    expect(storeRef.current?.session).toEqual({ email: 'me@example.com' });
  });

  it('회원가입 화면으로 이동할 수 있다', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/signup');
  });
});
