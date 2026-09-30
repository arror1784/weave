import type { ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

// 네이티브 설정의 단일 소스. ios/·android/ 폴더는 이 파일에서 생성되므로 직접 고치지 않는다(§5-14).
// Android 홈 화면 위젯 — 네이티브 코드가 생성되므로 Expo Go에선 동작하지 않는다(개발 빌드 필요).
const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'TodayWidget',
      label: '오늘의 일정',
      description: '오늘 할 일과 밀린 작업을 보여줘요',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: 'horizontal|vertical',
      // 30분(최소값)마다 갱신
      updatePeriodMillis: 1800000,
    },
  ],
};

const config: ExpoConfig = {
  name: 'weave',
  slug: 'weave',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'weave',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.weave.app',
  },
  android: {
    // 출시 후엔 바꿀 수 없다
    package: 'com.weave.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    ['react-native-android-widget', widgetConfig],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
