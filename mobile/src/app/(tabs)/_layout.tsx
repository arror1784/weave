import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, typography } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// 탭 화면(파일)과 탭 라벨·아이콘(여기)은 두 곳에 등록된다 — 탭을 추가·삭제할 땐 둘 다 고친다(mobile/CLAUDE.md §2-12).
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '오늘', icon: 'today-outline' },
  { name: 'schedule', title: '전체 일정', icon: 'calendar-outline' },
  { name: 'projects', title: '프로젝트', icon: 'folder-outline' },
  { name: 'settings', title: '설정', icon: 'settings-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: typography.label.fontFamily, fontSize: 12 },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: `${tab.title} 탭`,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
