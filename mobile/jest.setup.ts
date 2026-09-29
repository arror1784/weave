// 네이티브 모듈은 테스트에서 목으로 바꾼다 — 없으면 "native module is null"(§7)
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
