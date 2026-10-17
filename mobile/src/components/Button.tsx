import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary: 실 색 채움 / soft: 옅은 실 / outline: 흰 바탕+선 / dashed: 점선(추가 동작) / danger: 삭제 */
  variant?: 'primary' | 'soft' | 'outline' | 'dashed' | 'danger';
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  accessibilityHint?: string;
  /** 가로로 늘리지 않고 내용 크기만큼 */
  compact?: boolean;
};

/** 모든 버튼은 이 컴포넌트로. 터치 영역 48dp 이상(§5.2-7), 고정 높이 대신 패딩(§5.2-6). */
export function Button({ label, onPress, variant = 'primary', icon, disabled = false, accessibilityHint, compact = false }: ButtonProps) {
  const { colors, radius } = useAppTheme();
  const look = {
    primary: { bg: disabled ? colors.line : colors.thread, fg: disabled ? colors.inkSoft : colors.onThread, border: 'transparent', dashed: false },
    soft: { bg: colors.threadSoft, fg: colors.thread, border: 'transparent', dashed: false },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.line, dashed: false },
    dashed: { bg: 'transparent', fg: colors.inkSoft, border: colors.control, dashed: true },
    danger: { bg: colors.surface, fg: colors.dangerText, border: colors.dangerSoft, dashed: false },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          borderStyle: look.dashed ? 'dashed' : 'solid',
          borderRadius: radius.card,
          paddingVertical: variant === 'primary' ? 16 : 12,
        },
        compact ? styles.compact : styles.stretch,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.row}>
        {icon?.(look.fg)}
        {/* simple: 삼성 폰에서 목록이 바뀐 뒤 다시 그릴 때 마지막 단어가 둘째 줄로 밀려 잘렸다('개인 일정 추가' → '개인 일정', 2026-10-18) */}
        <AppText textBreakStrategy="simple" variant={variant === 'primary' || variant === 'soft' || variant === 'danger' ? 'label' : 'small'} color={look.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, justifyContent: 'center', borderWidth: 1, paddingHorizontal: 16 },
  stretch: { alignSelf: 'stretch' },
  compact: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pressed: { transform: [{ scale: 0.98 }] },
});
