import type { ExpoConfig } from 'expo/config';

// 네이티브 설정의 단일 소스. ios/·android/ 폴더는 이 파일에서 생성되므로 직접 고치지 않는다(§5-14).
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
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
