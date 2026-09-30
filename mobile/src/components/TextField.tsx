import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  /** 입력 규칙 안내 (에러가 없을 때 입력칸 아래에 보인다) */
  hint?: string;
  /** 입력칸 안 왼쪽 아이콘 */
  leading?: (color: string) => ReactNode;
  /** 입력칸 오른쪽에 붙는 요소 (예: D-9 배지) */
  accessory?: ReactNode;
  mono?: boolean;
};

/** 입력칸엔 항상 보이는 라벨(§5.2-3). 에러는 입력칸 바로 아래 글자로. 포커스되면 테두리가 실 색으로. */
export function TextField({ label, error, hint, leading, accessory, mono, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, radius, typography } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.thread : colors.control;

  return (
    <View style={styles.wrap}>
      <AppText variant="fieldLabel" tone="soft">
        {label}
      </AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          {leading ? <View style={styles.leading}>{leading(colors.inkSoft)}</View> : null}
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={error ?? hint}
            placeholderTextColor={colors.inkSoft}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              mono ? typography.mono : typography.body,
              styles.input,
              { color: colors.ink, backgroundColor: colors.surface, borderColor, borderRadius: radius.control, paddingLeft: leading ? 40 : 14 },
              mono && styles.monoSize,
              multiline && styles.multiline,
            ]}
            {...rest}
          />
        </View>
        {accessory}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.dangerText}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="soft">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, justifyContent: 'center' },
  leading: { position: 'absolute', left: 14, zIndex: 1 },
  input: { minHeight: 48, borderWidth: 1, paddingRight: 14, paddingVertical: 12 },
  monoSize: { fontSize: 15, lineHeight: 20 },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
});
