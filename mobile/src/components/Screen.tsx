import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** 내용이 길 수 있으면 true — 큰 글자 설정에서도 잘리지 않게 스크롤한다(§5.2-6) */
  scroll?: boolean;
  /** 네이티브 헤더가 위를 처리하는 화면은 ['bottom'] 등으로 줄인다 */
  edges?: Edge[];
};

/**
 * 모든 화면의 바깥 틀. Safe Area·배경색·키보드 회피를 한 곳에서 처리한다(§5.2-12·13).
 * RN 기본 SafeAreaView는 쓰지 않는다.
 */
export function Screen({ children, style, scroll = false, edges = ['top', 'bottom'] }: ScreenProps) {
  const { colors, spacing } = useAppTheme();
  const contentStyle = [{ padding: spacing.md, gap: spacing.md }, style];

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, ...contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
