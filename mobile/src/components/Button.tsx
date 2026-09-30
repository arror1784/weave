import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
};

/** 모든 버튼은 이 컴포넌트로. 터치 영역 48dp 이상(§5.2-7), 고정 높이 대신 패딩(§5.2-6). */
export function Button({ label, onPress, variant = 'primary', disabled = false, accessibilityHint }: ButtonProps) {
  const { colors, spacing, radius } = useAppTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    danger: { bg: colors.dangerSurface, fg: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderRadius: radius.control, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2 },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <AppText variant="label" style={{ color: palette.fg, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
