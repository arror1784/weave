import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
};

/** 입력칸엔 항상 보이는 라벨(§5.2-3). 에러는 입력칸 바로 아래 글자로. */
export function TextField({ label, error, multiline, ...rest }: TextFieldProps) {
  const { colors, spacing, typography } = useAppTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          typography.body,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: error ? colors.danger : colors.borderStrong,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 4,
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
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
