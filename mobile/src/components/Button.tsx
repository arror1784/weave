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
  const { colors, spacing } = useAppTheme();
  const background = variant === 'primary' ? colors.primary : 'transparent';
  const foreground = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.primary;
  const borderColor = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.borderStrong;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}>
      <AppText variant="label" style={{ color: foreground, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
});
