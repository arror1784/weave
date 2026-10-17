import { fireEvent, screen } from '@testing-library/react-native';

import { ApiError, NetworkError } from '@/api/client';
import LoginScreen from '@/app/(auth)/login';
import SignupScreen from '@/app/(auth)/signup';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithProviders, testAuth } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
});

describe('로그인', () => {
  it('로고·Weave 제목을 보여주고 Google 로그인은 없다 (이메일 로그인만)', async () => {
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Weave' })).toBeOnTheScreen();
    expect(screen.queryByText(/Google/)).toBeNull();
  });

  it('비워 두고 로그인하면 서버에 보내지 않고 오류를 보여준다', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByText('이메일을 입력해 주세요.')).toBeOnTheScreen();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeOnTheScreen();
    expect(testAuth.signIn).not.toHaveBeenCalled();
  });

  it('올바르게 입력하면 서버로 로그인한다', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'weave2026!');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(testAuth.signIn).toHaveBeenCalledWith('me@example.com', 'weave2026!');
  });

  it('서버가 거절하면(비밀번호 틀림·요청 과다) 서버 메시지를 보여준다', async () => {
    const signIn = jest.fn().mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 맞지 않아요.'));
    await renderWithProviders(<LoginScreen />, { auth: { signIn } });
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'wrong2026!');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('이메일 또는 비밀번호가 맞지 않아요.')).toBeOnTheScreen();
  });

  it('서버에 연결할 수 없으면 연결 안내를 보여준다', async () => {
    const signIn = jest.fn().mockRejectedValueOnce(new NetworkError());
    await renderWithProviders(<LoginScreen />, { auth: { signIn } });
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'weave2026!');
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.')).toBeOnTheScreen();
  });

  it('회원가입으로 간다', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/signup');
  });
});

describe('회원가입', () => {
  it('비밀번호가 다르면 오류, 맞으면 서버에 가입한다', async () => {
    await renderWithProviders(<SignupScreen />);
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret12!');
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret99!');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeOnTheScreen();
    expect(testAuth.signUp).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret12!');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(testAuth.signUp).toHaveBeenCalledWith('me@example.com', 'secret12!');
  });

  it('비밀번호 규칙(영문·숫자·특수문자 8자 이상)을 안내하고, 어기면 가입하지 않는다', async () => {
    await renderWithProviders(<SignupScreen />);
    expect(screen.getByText('영문·숫자·특수문자를 모두 넣어 8자 이상')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret123');
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(screen.getByText('영문·숫자·특수문자를 모두 넣어 주세요.')).toBeOnTheScreen();
    expect(testAuth.signUp).not.toHaveBeenCalled();
  });

  it('이미 가입한 이메일이면 이메일 칸에 서버 오류를 보여준다', async () => {
    const signUp = jest.fn().mockRejectedValueOnce(new ApiError(409, 'EMAIL_TAKEN', '이미 가입한 이메일이에요.'));
    await renderWithProviders(<SignupScreen />, { auth: { signUp } });
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'secret12!');
    await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), 'secret12!');
    await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
    expect(await screen.findByText('이미 가입한 이메일이에요.')).toBeOnTheScreen();
  });
});
