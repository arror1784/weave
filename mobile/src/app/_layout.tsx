import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import { ProjectCompleteDialog } from '@/components/ProjectCompleteDialog';
import { Splash } from '@/components/Splash';
import { ToastProvider } from '@/components/Toast';
import { MockStoreProvider, useMockStore } from '@/mocks/MockStoreProvider';
import { colors } from '@/theme';
import { fonts } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

// 밝은 테마만 쓴다 — 내비게이션 기본 색도 앱 토큰에 맞춘다.
const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.canvas, card: colors.surface, primary: colors.thread, text: colors.ink, border: colors.line },
};

function RootStack() {
  const { state } = useMockStore();
  const signedIn = state.session !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      {/* 로그인 전 화면 — 로그인하면 자동으로 (tabs)로 이동한다 */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="project/new/index" />
        <Stack.Screen name="project/new/chat" />
        <Stack.Screen name="project/new/review" />
        <Stack.Screen name="overload" />
        <Stack.Screen name="widgets" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
    [fonts.medium]: require('../../assets/fonts/Pretendard-Medium.otf'),
    [fonts.semibold]: require('../../assets/fonts/Pretendard-SemiBold.otf'),
    [fonts.bold]: require('../../assets/fonts/Pretendard-Bold.otf'),
    [fonts.black]: require('../../assets/fonts/Pretendard-Black.otf'),
    [fonts.mono]: require('../../assets/fonts/JetBrainsMono-SemiBold.ttf'),
    [fonts.monoBold]: require('../../assets/fonts/JetBrainsMono-Bold.ttf'),
  });
  const ready = fontsLoaded || fontError !== null;
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // 글꼴 로딩 실패 시에도 기본 글꼴로 앱은 뜬다
  if (!ready) return null;

  return (
    <MockStoreProvider>
      <ThemeProvider value={navigationTheme}>
        <ToastProvider>
          {/* 로딩 화면(00)이 끝난 뒤에 내비게이션을 띄운다 — 겹쳐 그리면 Android에서 로딩 화면이 보이지 않았다 */}
          {splashDone ? (
            <>
              <RootStack />
              {/* 마지막 작업을 끝내면 어느 화면에서든 프로젝트 완료 여부를 묻는다 */}
              <ProjectCompleteDialog />
            </>
          ) : (
            <Splash onDone={finishSplash} />
          )}
        </ToastProvider>
        <StatusBar style="dark" />
      </ThemeProvider>
    </MockStoreProvider>
  );
}
