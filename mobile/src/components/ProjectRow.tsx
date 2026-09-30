import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type ProjectRowProps = {
  /** 프로젝트 실 색 */
  threadColor: string;
  name: string;
  /** 진행률·마감·지연 요약 */
  summary: string;
  done: number;
  total: number;
  overdue: number;
  onPress: () => void;
};

/** 프로젝트 목록 한 줄: 프로젝트 실 색 + 이름 + 요약 + 진행 막대. */
export function ProjectRow({ threadColor, name, summary, done, total, overdue, onPress }: ProjectRowProps) {
  const { colors, spacing, radius } = useAppTheme();
  const thread = threadColor;
  const ratio = total === 0 ? 0 : done / total;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${summary}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderRadius: radius.panel, padding: spacing.md, gap: spacing.md }, pressed && { opacity: 0.8 }]}>
      <View accessible={false} style={[styles.thread, { backgroundColor: thread }]} />
      <View style={[styles.body, { gap: spacing.sm }]}>
        <AppText variant="subtitle" accessibilityRole="text">
          {name}
        </AppText>
        <AppText variant="caption" tone="secondary" style={overdue > 0 ? { color: colors.danger } : undefined}>
          {summary}
        </AppText>
        <View accessible={false} style={[styles.track, { backgroundColor: `${thread}26` }]}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: thread }]} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  thread: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  body: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
