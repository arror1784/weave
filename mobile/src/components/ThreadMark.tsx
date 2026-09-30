import { StyleSheet, View } from 'react-native';

import { threadColors } from '@/theme/colors';

/** Weave 표식: 프로젝트 실 색 다섯 가닥. 장식이므로 스크린리더에서 숨긴다. */
export function ThreadMark() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.row}>
      {threadColors.map((color, i) => (
        <View key={color} style={[styles.strand, { backgroundColor: color, height: 28 + (i % 2) * 12 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  strand: { width: 8, borderRadius: 4 },
});
