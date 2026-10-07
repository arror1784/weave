import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import * as activityApi from '@/api/activity';
import { useAuth } from '@/auth/AuthProvider';
import { mockPathname, resetRouterMock } from '@/test-utils/router';

import { ActivityTracker } from './ActivityTracker';

jest.mock('@/api/activity');
jest.mock('@/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
const api = jest.mocked(activityApi);
const auth = jest.mocked(useAuth);
const signedIn = (status: 'signedIn' | 'signedOut') => auth.mockReturnValue({ status } as ReturnType<typeof useAuth>);

let appStateListener: ((s: AppStateStatus) => void) | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  appStateListener = undefined;
  resetRouterMock();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, l) => {
    appStateListener = l as (s: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

describe('앱 사용 기록 (화면 없는 컴포넌트)', () => {
  it('로그인 상태로 앱이 뜨면 앱 열기와 지금 화면을 기록하고 보낸다', async () => {
    signedIn('signedIn');
    mockPathname.current = '/';
    await render(<ActivityTracker />);
    expect(api.logActivity).toHaveBeenCalledWith('APP_OPENED');
    expect(api.logActivity).toHaveBeenCalledWith('SCREEN_VIEWED', { path: '/' });
    expect(api.flushActivity).toHaveBeenCalled();
  });

  it('화면이 바뀔 때마다 화면 보기를 기록한다 — 같은 화면을 다시 그릴 때는 남기지 않는다', async () => {
    signedIn('signedIn');
    mockPathname.current = '/';
    const view = await render(<ActivityTracker />);
    mockPathname.current = '/projects/3';
    await view.rerender(<ActivityTracker />);
    await view.rerender(<ActivityTracker />);
    const screens = api.logActivity.mock.calls.filter((c) => c[0] === 'SCREEN_VIEWED').map((c) => c[1]);
    expect(screens).toEqual([{ path: '/' }, { path: '/projects/3' }]);
  });

  it('앱이 다시 앞으로 오면 앱 열기를 기록한다', async () => {
    signedIn('signedIn');
    await render(<ActivityTracker />);
    jest.clearAllMocks();
    await act(async () => appStateListener?.('active'));
    expect(api.logActivity).toHaveBeenCalledWith('APP_OPENED');
    expect(api.flushActivity).toHaveBeenCalled();
  });

  it('로그인 전에는 아무것도 기록하지 않고, 로그아웃하면 쌓인 기록을 지운다', async () => {
    signedIn('signedOut');
    await render(<ActivityTracker />);
    await act(async () => appStateListener?.('active'));
    expect(api.logActivity).not.toHaveBeenCalled();
    expect(api.clearActivity).toHaveBeenCalled();
  });
});
