import { Stack } from 'expo-router';

import { colors } from '@/theme';

// 프로젝트 탭 안의 스택 — 상세 화면에서도 하단 탭이 보인다(Figma).
export default function ProjectsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
