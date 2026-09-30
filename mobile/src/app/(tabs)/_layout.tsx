import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

// 탭 순서는 여기서 정한다(파일 이름순이 아니다) — Figma: 오늘 · 전체일정 · 프로젝트 · 설정
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
