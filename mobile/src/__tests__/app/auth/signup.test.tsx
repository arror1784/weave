import { fireEvent, screen } from '@testing-library/react-native';

import SignupScreen from '@/app/(auth)/signup';
import { resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

async function fill(email: string, password: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText('이메일'), email);
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), password);
  await fireEvent.changeText(screen.getByLabelText('비밀번호 확인'), confirm);
  await fireEvent.press(screen.getByRole('button', { name: '가입하기' }));
}

describe('회원가입 화면', () => {
  it('비밀번호가 8자 미만이면 오류를 보여준다', async () => {
    await renderWithStore(<SignupScreen />);
    await fill('me@example.com', 'short', 'short');
    expect(screen.getByText('비밀번호는 8자 이상이어야 해요.')).toBeOnTheScreen();
  });

  it('비밀번호 확인이 다르면 오류를 보여준다', async () => {
    await renderWithStore(<SignupScreen />);
    await fill('me@example.com', 'secret123', 'secret999');
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeOnTheScreen();
    expect(storeRef.current?.session).toBeNull();
  });

  it('올바르게 입력하면 가입 후 로그인된다 (목업)', async () => {
    await renderWithStore(<SignupScreen />);
    await fill('me@example.com', 'secret123', 'secret123');
    expect(storeRef.current?.session).toEqual({ email: 'me@example.com' });
  });
});
