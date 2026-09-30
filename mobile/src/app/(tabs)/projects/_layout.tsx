import { Stack } from 'expo-router';

import { colors } from '@/theme';

// 프로젝트 탭 안의 스택 — 상세 화면에서도 하단 탭이 보인다(Figma).
// 다른 곳에서 상세로 바로 가도(withAnchor) 목록이 아래에 깔려서 뒤로 가면 목록이 나온다.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProjectsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
