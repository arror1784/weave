// 네이티브 모듈은 테스트에서 목으로 바꾼다 — 없으면 "native module is null"(§7)
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// 슬라이더(네이티브)는 접근성 값만 가진 View로 대신한다
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return function Slider(props: { value: number; onValueChange: (v: number) => void; accessibilityLabel?: string }) {
    return <View accessible accessibilityRole="adjustable" accessibilityLabel={props.accessibilityLabel} accessibilityValue={{ now: props.value }} testID="slider" {...props} />;
  };
});

// 화면 테스트용 expo-router 목: 이동 호출만 기록한다. 레이아웃(_layout)은 테스트하지 않는다.
jest.mock('expo-router', () => {
  const { mockRouter, mockParams, mockPathname } = require('./src/test-utils/router');
  const Null = () => null;
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => mockParams.current,
    usePathname: () => mockPathname.current,
    Stack: Object.assign(Null, { Screen: Null, Protected: Null }),
    Tabs: Object.assign(Null, { Screen: Null, Protected: Null }),
  };
});

// 파일·사진 선택기(네이티브) — 테스트마다 jest.mocked(...).mockResolvedValueOnce로 결과를 정한다
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })) }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  UIImagePickerPreferredAssetRepresentationMode: { Automatic: 'automatic', Compatible: 'compatible', Current: 'current' },
}));

// 토큰 보안 저장소(네이티브)
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}) }));

// 첨부 내려받기·공유(네이티브)
jest.mock('expo-file-system', () => ({
  File: Object.assign(jest.fn(), { downloadFileAsync: jest.fn(async () => ({ uri: 'file:///cache/x' })) }),
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
