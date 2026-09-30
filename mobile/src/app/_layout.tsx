import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { MockStoreProvider, useMockStore } from '@/mocks/MockStoreProvider';
import { colors, typography } from '@/theme';
import { fonts } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

// 밝은 테마만 쓴다 — 내비게이션 기본 색도 앱 토큰에 맞춘다.
const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background, primary: colors.primary, text: colors.text, border: colors.border },
};

function RootStack() {
  const { state } = useMockStore();
  const signedIn = state.session !== null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontFamily: typography.subtitle.fontFamily },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* 로그인 전 화면 — 로그인하면 자동으로 (tabs)로 이동한다 */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project/new/index" options={{ title: '새 프로젝트' }} />
        <Stack.Screen name="project/new/chat" options={{ title: '작업 단계 만들기' }} />
        <Stack.Screen name="project/new/review" options={{ title: '작업 단계 검토' }} />
        <Stack.Screen name="project/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="project/[id]/schedule" options={{ title: '프로젝트 일정' }} />
        <Stack.Screen name="project/[id]/task/[taskId]" options={{ title: '작업 수정' }} />
        <Stack.Screen name="settings/account" options={{ title: '계정 관리' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
    [fonts.semibold]: require('../../assets/fonts/Pretendard-SemiBold.otf'),
    [fonts.bold]: require('../../assets/fonts/Pretendard-Bold.otf'),
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // 글꼴 로딩 실패 시에도 기본 글꼴로 앱은 뜬다
  if (!ready) return null;

  return (
    <MockStoreProvider>
      <ThemeProvider value={navigationTheme}>
        <RootStack />
        <StatusBar style="dark" />
      </ThemeProvider>
    </MockStoreProvider>
  );
}
