import { StyleSheet, View } from 'react-native';

import type { Task } from '@/mocks/types';
import { threadColorFor } from '@/theme/colors';
import { useAppTheme } from '@/theme';

type WeaveTask = Pick<Task, 'id' | 'projectId' | 'done'>;

/**
 * 오늘의 진행 띠 — 오늘 작업 하나가 조각 하나, 조각 색은 그 작업의 프로젝트 실 색.
 * 끝낸 작업은 실 색으로 채워지고, 남은 작업은 옅은 실 색으로 남는다.
 */
export function DayWeave({ tasks, projects }: { tasks: WeaveTask[]; projects: readonly { id: string }[] }) {
  const { colors, radius } = useAppTheme();
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.done).length;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`오늘 작업 ${tasks.length}개 중 ${done}개 완료`} style={[styles.row, { backgroundColor: colors.surface, borderRadius: radius.pill }]}>
      {tasks.map((task) => {
        const color = threadColorFor(task.projectId, projects);
        return (
          <View
            key={task.id}
            testID="weave-segment"
            style={[styles.segment, { borderRadius: radius.pill, backgroundColor: task.done ? color : `${color}33`, borderColor: color }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, padding: 4, height: 20 },
  segment: { flex: 1, borderWidth: 1.5 },
});
