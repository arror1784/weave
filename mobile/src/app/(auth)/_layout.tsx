import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function AuthLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background }, headerTitleStyle: { color: colors.text } }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: '회원가입' }} />
    </Stack>
  );
}
