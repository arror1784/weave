import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** 스크롤 영역 안쪽 스타일 */
  contentStyle?: ViewStyle;
  /** 내용이 길 수 있으면 true — 큰 글자 설정에서도 잘리지 않게 스크롤한다(§5.2-6) */
  scroll?: boolean;
  edges?: Edge[];
  /** 스크롤 위(고정) 영역 — 상단 바 등 */
  header?: ReactNode;
  /** 스크롤 아래(고정) 영역 — 하단 주 버튼 등 */
  footer?: ReactNode;
  /** 화면 위에 떠 있는 요소 — 떠 있는 버튼(FAB)·하단 시트 등 */
  overlay?: ReactNode;
  background?: 'canvas' | 'surface';
};

/**
 * 모든 화면의 바깥 틀. Safe Area·배경색·키보드 회피를 한 곳에서 처리한다(§5.2-12·13).
 * RN 기본 SafeAreaView는 쓰지 않는다.
 */
export function Screen({ children, contentStyle, scroll = true, edges = ['top'], header, footer, overlay, background = 'canvas' }: ScreenProps) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: background === 'surface' ? colors.surface : colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {scroll ? (
          <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
});
