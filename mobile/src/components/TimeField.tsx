import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

const STEP = 30;
const DAY = 24 * 60;

export const minutesToText = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** '13:30' · '1330' · '930' · '9' → 분. 시각이 아니면 null */
export function parseTime(text: string): number | null {
  const t = text.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(t) ?? /^(\d{1,2})(\d{2})$/.exec(t) ?? /^(\d{1,2})()$/.exec(t);
  if (!match) return null;
  const h = Number(match[1]);
  const m = match[2] ? Number(match[2]) : 0;
  return h < 24 && m < 60 ? h * 60 + m : null;
}

/**
 * 시각 한 줄 — −/+는 30분씩, 가운데 숫자 칸을 눌러 직접 적을 수도 있다(분은 아무 값이나, 사용자 결정 2026-10-23).
 * 적은 값은 입력을 마칠 때 읽는다. 시각이 아니면 알리고 원래 값으로 돌린다. nextDay면 '다음 날'(자정 넘김)을 함께 보인다.
 */
export function TimeField({ label, minutes, onChange, nextDay = false }: { label: string; minutes: number; onChange: (m: number) => void; nextDay?: boolean }) {
  const { colors, radius, typography } = useAppTheme();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function commit() {
    if (draft === null) return;
    const parsed = parseTime(draft);
    setError(parsed === null);
    if (parsed !== null) onChange(parsed);
    setDraft(null);
  }

  const button = (name: string, delta: number, text: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${name}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        setError(false);
        onChange(minutes + delta);
      }}
      style={[styles.step, { borderColor: colors.line, borderRadius: radius.control }]}
    >
      <AppText color={disabled ? colors.inkFaint : colors.ink}>{text}</AppText>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText variant="small" style={styles.flex}>
          {label}
        </AppText>
        {button('30분 이르게', -STEP, '−', minutes - STEP < 0)}
        <View style={styles.timeBox}>
          {nextDay ? (
            <AppText variant="caption" tone="soft">
              다음 날
            </AppText>
          ) : null}
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={nextDay ? '다음 날 시각' : '숫자로 적을 수 있어요'}
            value={draft ?? minutesToText(minutes)}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="numbers-and-punctuation"
            selectTextOnFocus
            maxLength={5}
            style={[
              typography.monoBold,
              styles.time,
              { color: colors.thread, borderColor: error ? colors.danger : colors.control, borderRadius: radius.control, backgroundColor: colors.surface },
            ]}
          />
        </View>
        {button('30분 늦게', STEP, '+', minutes + STEP > DAY - 1)}
      </View>
      {error ? (
        <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
          <AppText variant="small" color={colors.dangerText}>
            시각은 13:30처럼 적어 주세요.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  flex: { flex: 1 },
  step: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeBox: { alignItems: 'center' },
  time: { fontSize: 18, lineHeight: 24, minWidth: 76, minHeight: 44, textAlign: 'center', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 8 },
});
