import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { IconCal, IconFolder, IconGear, IconSun, type IconProps } from './icons';

// 탭 화면(파일)과 탭 라벨·아이콘(여기)은 두 곳에 등록된다 — 탭을 추가·삭제할 땐 둘 다 고친다(mobile/CLAUDE.md §2-12).
const TABS: Record<string, { label: string; Icon: (p: IconProps) => React.ReactNode }> = {
  index: { label: '오늘', Icon: IconSun },
  schedule: { label: '전체일정', Icon: IconCal },
  projects: { label: '프로젝트', Icon: IconFolder },
  settings: { label: '설정', Icon: IconGear },
};

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** 하단 탭 (Figma TabBar): 선 아이콘 + 작은 굵은 라벨, 선택된 탭은 실 색. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.thread : colors.inkSoft;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}>
            <tab.Icon size={22} color={color} />
            <AppText variant="micro" color={color}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48, justifyContent: 'center' },
});
