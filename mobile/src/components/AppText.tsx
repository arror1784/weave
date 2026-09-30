import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  /** soft: 보조 글자(inkSoft). 정보를 담은 글자에 inkFaint는 쓰지 않는다(대비 부족). */
  tone?: 'default' | 'soft';
  color?: string;
};

const HEADER_VARIANTS: TypographyVariant[] = ['hero', 'title', 'heading', 'sheetTitle'];

/** 모든 글자는 이 컴포넌트로. 제목 계열은 스크린리더에 header로 알린다. allowFontScaling을 끄지 않는다(§5.2-6). */
export function AppText({ variant = 'body', tone = 'default', color, style, ...rest }: AppTextProps) {
  const { colors, typography } = useAppTheme();
  return (
    <Text
      accessibilityRole={HEADER_VARIANTS.includes(variant) ? 'header' : undefined}
      style={[typography[variant], { color: color ?? (tone === 'soft' ? colors.inkSoft : colors.ink) }, StyleSheet.flatten(style)]}
      {...rest}
    />
  );
}
