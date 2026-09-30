import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: 'default' | 'secondary';
};

/** 모든 글자는 이 컴포넌트로. title·subtitle은 스크린리더에 제목(header)으로 알린다. allowFontScaling을 끄지 않는다(§5.2-6). */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { colors, typography } = useAppTheme();
  return (
    <Text
      accessibilityRole={variant === 'title' || variant === 'subtitle' ? 'header' : undefined}
      style={[
        typography[variant],
        { color: tone === 'secondary' ? colors.textSecondary : colors.text },
        StyleSheet.flatten(style),
      ]}
      {...rest}
    />
  );
}
