import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * 슬라이더 설정 한 줄 — 제목 · 값 · 슬라이더. 값을 바꾸기만 하고 저장은 화면의 '저장' 버튼이 한다(사용자 결정 2026-10-22).
 * 값 글자는 고정폭 글꼴 + 최소 폭이라 '1시간' ↔ '1.5시간'으로 바뀌어도 줄이 흔들리지 않는다.
 */
export function SliderField({
  label,
  title = label,
  min,
  max,
  step,
  value,
  format,
  onChange,
  testID,
}: {
  /** 스크린리더 이름 */
  label: string;
  title?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  testID?: string;
}) {
  const { colors } = useAppTheme();
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <View style={styles.field} testID={testID}>
      <View style={styles.between}>
        <AppText variant="small" style={styles.flex}>
          {title}
        </AppText>
        <AppText variant="monoBold" color={value === 0 ? colors.inkSoft : colors.thread} style={styles.value}>
          {format(value)}
        </AppText>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={(v: number) => onChange(snap(v))}
        minimumTrackTintColor={colors.thread}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.thread}
        style={styles.slider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: 6 },
  between: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  flex: { flex: 1 },
  value: { fontSize: 18, lineHeight: 24, minWidth: 84, textAlign: 'right' },
  slider: { height: 40, marginHorizontal: -8 },
});
