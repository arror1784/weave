import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { IconBack } from './icons';

/** 화면 상단 바 (Figma TopBar): 뒤로 + 제목 + 오른쪽 요소. 흰 바탕. */
export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} hitSlop={8} style={styles.back}>
        <IconBack size={22} color={colors.inkSoft} />
      </Pressable>
      <AppText variant="label" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, minHeight: 56 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
