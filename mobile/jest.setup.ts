// 네이티브 모듈은 테스트에서 목으로 바꾼다 — 없으면 "native module is null"(§7)
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// 화면 테스트용 expo-router 목: 이동 호출만 기록한다. 레이아웃(_layout)은 테스트하지 않는다.
jest.mock('expo-router', () => {
  const { mockRouter, mockParams } = require('./src/test-utils/router');
  const Null = () => null;
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => mockParams.current,
    Stack: Object.assign(Null, { Screen: Null, Protected: Null }),
    Tabs: Object.assign(Null, { Screen: Null, Protected: Null }),
  };
});
