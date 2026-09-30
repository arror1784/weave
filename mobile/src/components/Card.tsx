import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

export function Card({ children, tone = 'default', style }: { children: ReactNode; tone?: 'default' | 'danger'; style?: ViewStyle }) {
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'danger' ? colors.dangerSurface : colors.surface,
          borderColor: tone === 'danger' ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
