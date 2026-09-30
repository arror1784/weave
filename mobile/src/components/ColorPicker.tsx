import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { projectColorOrder, projectPaletteFor, type ProjectColorKey } from '@/theme/colors';

import { IconCheck } from './icons';

/** 프로젝트 색 고르기 — 색 원 8개(라디오). 스크린리더에는 색 이름을 읽어 준다(§4-4). */
export function ColorPicker({ value, onChange, label }: { value: ProjectColorKey; onChange: (color: ProjectColorKey) => void; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
      {projectColorOrder.map((key) => {
        const palette = projectPaletteFor(key);
        const selected = key === value;
        return (
          <Pressable key={key} accessibilityRole="radio" accessibilityLabel={palette.label} accessibilityState={{ selected }} onPress={() => onChange(key)} style={styles.hit}>
            <View style={[styles.ring, { borderColor: selected ? colors.ink : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: palette.dot }]}>{selected ? <IconCheck size={16} color={colors.onThread} /> : null}</View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  hit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
