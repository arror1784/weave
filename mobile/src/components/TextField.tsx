import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
};

/** 입력칸엔 항상 보이는 라벨(§5.2-3). 에러는 입력칸 바로 아래 글자로. 포커스되면 테두리가 강조색으로 바뀐다. */
export function TextField({ label, error, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={{ gap: spacing.sm - 2 }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textSecondary}
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
          styles.input,
          typography.body,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: radius.control,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 6,
          },
          multiline && styles.multiline,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderWidth: 1.5 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
