import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { MockStoreProvider, useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

function RootStack() {
  const { state } = useMockStore();
  const { colors } = useAppTheme();
  const signedIn = state.session !== null;

  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background }, headerTitleStyle: { color: colors.text } }}>
      {/* 로그인 전 화면 — 로그인하면 자동으로 (tabs)로 이동한다 */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project/new/index" options={{ title: '새 프로젝트' }} />
        <Stack.Screen name="project/new/chat" options={{ title: '작업 단계 만들기' }} />
        <Stack.Screen name="project/new/review" options={{ title: '작업 단계 검토' }} />
        <Stack.Screen name="project/[id]/index" options={{ title: '프로젝트' }} />
        <Stack.Screen name="project/[id]/schedule" options={{ title: '프로젝트 일정' }} />
        <Stack.Screen name="project/[id]/task/[taskId]" options={{ title: '작업 수정' }} />
        <Stack.Screen name="settings/account" options={{ title: '계정 관리' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { scheme } = useAppTheme();
  return (
    <MockStoreProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootStack />
        <StatusBar style="auto" />
      </ThemeProvider>
    </MockStoreProvider>
  );
}
