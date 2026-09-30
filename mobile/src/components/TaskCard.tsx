import { StyleSheet, View } from 'react-native';

import { dDayLabel, type DateKey } from '@/lib/date';
import { isOverdue, taskTone } from '@/mocks/store';
import type { Project, Task } from '@/mocks/types';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';

import { AppText } from './AppText';
import { Badge } from './Badge';
import { Checkbox } from './Checkbox';
import { DDay } from './DDay';
import { IconClock, IconWarn } from './icons';

type TaskCardProps = {
  task: Task;
  project: Project;
  today: DateKey;
  onToggle: () => void;
  /** 선행 작업이 안 끝났으면 그 이름 */
  blockedBy?: string;
};

/** 오늘 할 일 카드 (Figma TaskCard): 배지·지연 표시 / 작업명 / D-day·소요 시간·선행 미완료 경고. */
export function TaskCard({ task, project, today, onToggle, blockedBy }: TaskCardProps) {
  const { colors, radius } = useAppTheme();
  const late = isOverdue(task, today);
  const palette = projectPaletteFor(project.color);
  const minutes = Math.round((task.estimatedHours ?? 0) * 60);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radius.card, borderColor: late ? colors.dangerSoft : colors.line, opacity: task.done ? 0.55 : 1 },
      ]}>
      {late ? <View style={[styles.lateBar, { backgroundColor: colors.danger }]} /> : null}
      <View style={styles.row}>
        <Checkbox checked={task.done} onToggle={onToggle} label={`${task.title} 완료`} color={palette.dot} />
        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge project={project} small />
            {late ? (
              <View style={[styles.pill, { backgroundColor: colors.dangerSoft }]}>
                <AppText variant="micro" color={colors.dangerText}>
                  지연
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText style={task.done ? { color: colors.inkSoft, textDecorationLine: 'line-through' } : undefined}>{task.title}</AppText>
          <View style={styles.meta}>
            {task.dueDate ? <DDay label={dDayLabel(task.dueDate, today)} tone={taskTone(task, today)} /> : null}
            {minutes > 0 ? (
              <View style={styles.inline}>
                <IconClock size={12} color={colors.inkSoft} />
                <AppText variant="mono" tone="soft">{`${minutes}분`}</AppText>
              </View>
            ) : null}
            {blockedBy && !task.done ? (
              <View style={styles.inline}>
                <IconWarn size={12} color={colors.warn} />
                <AppText variant="micro" color={colors.warnText}>{`${blockedBy} 미완료`}</AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, overflow: 'hidden' },
  lateBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  body: { flex: 1, gap: 6 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
