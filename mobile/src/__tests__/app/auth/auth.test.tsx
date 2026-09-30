import { fireEvent, screen } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';
import SignupScreen from '@/app/(auth)/signup';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('로그인', () => {
  it('로고·Weave 제목을 보여주고 Google 로그인은 없다 (이메일 로그인만)', async () => {
    await renderWithStore(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Weave' })).toBeOnTheScreen();
    expect(screen.queryByText(/Google/)).toBeNull();
  });

  it('비워 두고 로그인하면 오류를 보여준다', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByText('이메일을 입력해 주세요.')).toBeOnTheScreen();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeOnTheScreen();
  });

  it('올바르게 입력하면 로그인된다 (목업)', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(storeRef.current?.session).toEqual({ email: 'me@example.com' });
  });

  it('회원가입으로 간다', async () => {
    await renderWithStore(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/signup');
  });
});

describe('회원가입', () => {
  it('비밀번호가 다르면 오류, 맞으면 가입 후 로그인된다 (목업)', async () => {
    await renderWithStore(<SignupScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret12!');
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret99!');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret12!');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(storeRef.current?.session).toEqual({ email: 'me@example.com' });
  });

  it('비밀번호 규칙(영문·숫자·특수문자 8자 이상)을 안내하고, 어기면 가입하지 않는다', async () => {
    await renderWithStore(<SignupScreen />);
    expect(screen.getByText('영문·숫자·특수문자를 모두 넣어 8자 이상')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret123');
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(screen.getByText('영문·숫자·특수문자를 모두 넣어 주세요.')).toBeOnTheScreen();
    expect(storeRef.current?.session).toBeNull();
  });
});
