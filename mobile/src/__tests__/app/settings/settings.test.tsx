import { act, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import AccountScreen from '@/app/settings/account';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

const session = { email: 'me@example.com' };

describe('설정 화면', () => {
  it('계정 관리로 이동한다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '계정 관리, me@example.com' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/account');
  });

  it('로그아웃하면 세션과 데이터가 지워진다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(storeRef.current?.session).toBeNull();
    expect(storeRef.current?.tasks).toEqual([]);
  });
});

describe('계정 관리 화면', () => {
  it('로그인한 이메일을 보여준다', async () => {
    await renderWithStore(<AccountScreen />, { session });
    expect(screen.getByText('me@example.com')).toBeOnTheScreen();
  });

  it('계정 삭제는 확인을 받은 뒤에 한다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithStore(<AccountScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '계정 삭제' }));
    expect(storeRef.current?.session).not.toBeNull();

    await act(async () => alert.mock.calls[0][2]!.find((b) => b.style === 'destructive')!.onPress!());
    expect(storeRef.current?.session).toBeNull();
  });
});
