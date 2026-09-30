import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

/** 두 가지 보기 전환 (Figma: 회색 트랙 위 흰 알약). 스크린리더에는 탭으로 알린다. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors, radius } = useAppTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: colors.line, borderRadius: radius.control }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, { borderRadius: radius.control - 4 }, selected && { backgroundColor: colors.surface, elevation: 1 }]}>
            <AppText variant="label" style={styles.label} tone={selected ? 'default' : 'soft'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4 },
  option: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14 },
});
