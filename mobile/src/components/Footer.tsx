import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

/** 화면 아래 고정 영역 (Figma: 위 선 + 흰 바탕 + 주 버튼) */
export function Footer({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: 16 + insets.bottom }]}>{children}</View>;
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 16 },
});
