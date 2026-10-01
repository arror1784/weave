import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { colors } from '@/theme/colors';

import { ToastProvider, useToast } from './Toast';

function Trigger({ kind }: { kind?: 'error' }) {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" onPress={() => toast('메시지', kind)}>
      <Text>띄우기</Text>
    </Pressable>
  );
}

const CHECK_PATH = 'M4 12l5 5 11-11';
const WARN_PATH = 'M12 3 2 20h20L12 3Z';
const drawn = () => JSON.stringify(screen.toJSON());

describe('Toast', () => {
  it('완료 알림은 검은 바탕에 체크 아이콘', async () => {
    await render(<ToastProvider><Trigger /></ToastProvider>);
    await fireEvent.press(screen.getByRole('button', { name: '띄우기' }));
    expect(screen.getByTestId('toast')).toHaveStyle({ backgroundColor: colors.ink });
    expect(drawn()).toContain(CHECK_PATH);
    expect(drawn()).not.toContain(WARN_PATH);
  });

  it('오류 알림은 빨간 바탕에 경고 아이콘 — 체크 아이콘을 쓰지 않는다', async () => {
    await render(<ToastProvider><Trigger kind="error" /></ToastProvider>);
    await fireEvent.press(screen.getByRole('button', { name: '띄우기' }));
    expect(screen.getByText('메시지')).toBeOnTheScreen();
    expect(screen.getByTestId('toast')).toHaveStyle({ backgroundColor: colors.dangerText });
    expect(drawn()).toContain(WARN_PATH);
    expect(drawn()).not.toContain(CHECK_PATH);
  });
});
