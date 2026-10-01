import { render } from '@testing-library/react-native';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { Screen } from './Screen';

// 키보드 회피 방식(behavior)을 확인하려고 받은 props를 기록한다
const kavProps: { behavior?: string }[] = [];
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { behavior?: string; children?: React.ReactNode }) => {
      kavProps.push(props);
      return <MockView>{props.children}</MockView>;
    },
  };
});

describe('Screen', () => {
  it('Android에서도 키보드만큼 아래(하단 입력칸)를 올린다 — edge-to-edge라 시스템이 화면을 줄여 주지 않는다', async () => {
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      await render(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
          <Screen footer={<View />}>
            <AppText>내용</AppText>
          </Screen>
        </SafeAreaProvider>,
      );
      expect(kavProps.at(-1)?.behavior).toBe('padding');
    } finally {
      Platform.OS = original;
    }
  });
});
