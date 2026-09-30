import { act, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import WidgetsScreen from '@/app/widgets';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);
const session = { email: 'me@example.com' };

describe('설정', () => {
  it('계정 이메일을 보여준다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    expect(screen.getByText('me@example.com')).toBeOnTheScreen();
  });

  it('과부하 기준: 주간 가용 시간을 바꾸면 하루 평균도 바뀐다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    expect(screen.getByText('25시간')).toBeOnTheScreen();
    await act(async () => screen.getByTestId('slider').props.onValueChange(35));
    expect(storeRef.current?.settings.weeklyAvailableHours).toBe(35);
    expect(screen.getByText(/하루 평균 약 7시간/)).toBeOnTheScreen();
  });

  it('홈 화면 위젯 미리보기로 간다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '홈 화면 위젯' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/widgets');
  });

  it('로그아웃하면 세션과 데이터가 지워진다', async () => {
    await renderWithStore(<SettingsScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(storeRef.current?.session).toBeNull();
    expect(storeRef.current?.tasks).toEqual([]);
  });

  it('계정 삭제는 확인을 받은 뒤에 한다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithStore(<SettingsScreen />, { session });
    await fireEvent.press(screen.getByRole('button', { name: '계정 삭제' }));
    expect(storeRef.current?.session).not.toBeNull();
    await act(async () => alert.mock.calls[0][2]!.find((b) => b.style === 'destructive')!.onPress!());
    expect(storeRef.current?.session).toBeNull();
  });
});

describe('홈 화면 위젯 미리보기', () => {
  it('소형(남은 개수·가장 급한 일)과 중형(오늘 작업 목록·과부하)을 보여준다', async () => {
    await renderWithStore(<WidgetsScreen />);
    expect(screen.getByText('소형 2×2')).toBeOnTheScreen();
    expect(screen.getByText('중형 4×2')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^오늘 6개 남음, 가장 급한 일 행사 장소 섭외/)).toBeOnTheScreen();
    expect(screen.getByText('과부하 11h / 5h')).toBeOnTheScreen();
  });
});
