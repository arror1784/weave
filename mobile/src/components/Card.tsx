import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

/** 흰 패널. 바탕(차가운 흰색) 위에서 그림자 없이 색 차이로만 구분한다. danger는 밀린 작업처럼 경고가 필요한 묶음. */
export function Card({ children, tone = 'default', style }: { children: ReactNode; tone?: 'default' | 'danger'; style?: ViewStyle }) {
  const { colors, spacing, radius } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'danger' ? colors.dangerSurface : colors.surface,
          borderRadius: radius.panel,
          padding: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
