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

// 배포 앱과 개발 빌드를 폰에 나란히 설치한다(사용자 결정 2026-10-19) — 개발 빌드는 APP_VARIANT=development로 만든다.
// 패키지·스킴이 다르면 두 앱이 같은 링크(weave://)를 두고 다투지 않는다.
const isDev = process.env.APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: isDev ? 'weave dev' : 'weave',
  slug: 'weave',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: isDev ? 'weave-dev' : 'weave',
  // 밝은 테마만 지원 — 다크 모드 미지원
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.weave.app',
  },
  android: {
    // 출시 후엔 바꿀 수 없다(배포 앱). 개발 빌드는 .dev를 붙여 따로 설치된다
    package: isDev ? 'com.weave.app.dev' : 'com.weave.app',
    // Weave 로고(WeaveMark)로 만든 아이콘 — 바탕은 실 색(colors.thread), 전경은 날실·씨실
    adaptiveIcon: {
      backgroundColor: '#2B4C8C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // 앱 안 로딩 화면(Splash, 흰 바탕 + 96dp 로고)과 이어지도록
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    [
      'expo-image-picker',
      {
        // 참고자료 사진 첨부 — Android는 시스템 사진 선택기라 권한이 필요 없다. 카메라·마이크는 쓰지 않으니 막는다(§3-15).
        photosPermission: '프로젝트 참고자료로 첨부할 사진을 고르기 위해 사진 보관함에 접근해요.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    ['react-native-android-widget', widgetConfig],
    // 배포 앱 release 빌드는 배포용 키로 서명(키는 저장소 밖 — plugins/with-release-signing.js)
    ...(isDev ? [] : ['./plugins/with-release-signing']),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
