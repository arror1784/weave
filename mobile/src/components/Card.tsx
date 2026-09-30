import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

/** 흰 카드: 얇은 선(line) + 둥근 모서리 16 (Figma rounded-2xl border-line bg-surface). */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { colors, radius } = useAppTheme();
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.card }, style]}>{children}</View>;
}
