import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

type TaskRowProps = {
  title: string;
  /** 제목 아래 보조 정보 (프로젝트명·D+n 등) */
  meta?: string;
  done: boolean;
  onToggle: () => void;
  /** 있으면 제목 영역을 눌러 상세로 이동 */
  onPress?: () => void;
  tone?: 'default' | 'danger';
};

/**
 * 작업 한 줄: 완료 체크박스 + 제목.
 * 체크박스와 제목을 따로 누를 수 있게 분리했다 — 각각 48dp 이상, 스크린리더에서도 따로 읽힌다(§5.2-1·7).
 */
export function TaskRow({ title, meta, done, onToggle, onPress, tone = 'default' }: TaskRowProps) {
  const { colors, spacing } = useAppTheme();
  const accent = tone === 'danger' ? colors.danger : colors.primary;

  const content = (
    <View style={styles.text}>
      <AppText style={done ? styles.doneText : undefined}>{title}</AppText>
      {meta ? (
        <AppText variant="caption" tone="secondary" style={tone === 'danger' ? { color: colors.danger } : undefined}>
          {meta}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${title} 완료`}
        onPress={onToggle}
        hitSlop={4}
        style={styles.checkbox}>
        <Ionicons name={done ? 'checkbox' : 'square-outline'} size={28} color={done ? accent : colors.borderStrong} />
      </Pressable>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={meta ? `${title}, ${meta}` : title} accessibilityHint="작업 상세로 이동" onPress={onPress} style={styles.pressable}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  pressable: { flex: 1, minHeight: 48, justifyContent: 'center' },
  text: { flex: 1, justifyContent: 'center', minHeight: 48 },
  doneText: { textDecorationLine: 'line-through' },
});
