import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/** 모든 화면의 바깥 틀. Safe Area와 배경색을 한 곳에서 처리한다(§5.2-12). RN 기본 SafeAreaView는 쓰지 않는다. */
export function Screen({ children, style }: ScreenProps) {
  const { colors, spacing } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { padding: spacing.md }, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1 },
});
