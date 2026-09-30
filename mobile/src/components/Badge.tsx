import { StyleSheet, View } from 'react-native';

import type { Project } from '@/mocks/types';
import { projectPaletteFor } from '@/theme/colors';
import { fonts } from '@/theme/typography';

import { AppText } from './AppText';

/** 프로젝트 배지: 색 점 + 프로젝트 이름 (Figma Badge). 색만으로 구분하지 않도록 이름을 늘 함께 쓴다(§5.2-4). */
export function Badge({ project, small = false }: { project: Pick<Project, 'name' | 'color'>; small?: boolean }) {
  const palette = projectPaletteFor(project.color);
  return (
    <View style={[styles.badge, small ? styles.small : styles.regular, { backgroundColor: palette.soft }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <AppText variant={small ? 'micro' : 'caption'} color={palette.text} style={styles.text}>
        {project.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, alignSelf: 'flex-start' },
  small: { paddingHorizontal: 8, paddingVertical: 2 },
  regular: { paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.medium },
});
