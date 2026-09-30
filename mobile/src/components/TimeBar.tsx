import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/** 시간 막대 (Figma TimeBar): 라벨 + 시간 + 막대. muted는 줄어들기 전 원래 길이(회색). */
export function TimeBar({ label, hours, max, color, textColor, muted }: { label: string; hours: number; max: number; color: string; textColor: string; muted?: number }) {
  const { colors } = useAppTheme();
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%` as const;
  return (
    <View accessible accessibilityLabel={`${label} ${hours}시간`}>
      <View style={styles.head}>
        <AppText variant="small" tone="soft">
          {label}
        </AppText>
        <AppText variant="monoBold" color={textColor} style={styles.value}>{`${hours}시간`}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.canvas }]}>
        {muted !== undefined ? <View style={[styles.fill, { width: pct(muted), backgroundColor: colors.line }]} /> : null}
        <View style={[styles.fill, { width: pct(hours), backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  value: { fontSize: 14 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
});
