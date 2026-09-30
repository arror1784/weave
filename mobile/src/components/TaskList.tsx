import { StyleSheet, View } from 'react-native';

import { dDayLabel, type DateKey } from '@/lib/date';
import type { Project, Task } from '@/mocks/types';
import { useAppTheme } from '@/theme';
import { threadColorFor } from '@/theme/colors';

import { TaskRow } from './TaskRow';

type TaskListProps = {
  tasks: Task[];
  projects: Project[];
  today: DateKey;
  onToggle: (taskId: string) => void;
  onPressTask?: (task: Task) => void;
  /** 프로젝트 이름을 보조 정보에 넣을지 (프로젝트 상세에선 끈다) */
  showProject?: boolean;
  /** 밀린 작업이면 D+n을 붙이고 경고색으로 */
  overdue?: boolean;
};

/** 작업 목록. 행 사이는 얇은 선으로만 나눈다. 여러 프로젝트가 섞이면 각 행에 프로젝트 실 색을 단다. */
export function TaskList({ tasks, projects, today, onToggle, onPressTask, showProject = true, overdue = false }: TaskListProps) {
  const { colors } = useAppTheme();
  return (
    <View>
      {tasks.map((task, index) => {
        const parts: string[] = [];
        if (showProject) parts.push(projects.find((p) => p.id === task.projectId)?.name ?? '');
        if (overdue && task.scheduledDate) parts.push(dDayLabel(task.scheduledDate, today));
        if (!showProject && task.estimatedHours !== null) parts.push(`${task.estimatedHours}시간`);
        return (
          <View key={task.id} style={index > 0 ? [styles.divider, { borderTopColor: overdue ? colors.dangerBorder : colors.border }] : undefined}>
            <TaskRow
              title={task.title}
              meta={parts.filter(Boolean).join(' · ') || undefined}
              done={task.done}
              tone={overdue ? 'danger' : 'default'}
              threadColor={showProject ? threadColorFor(task.projectId, projects) : undefined}
              onToggle={() => onToggle(task.id)}
              onPress={onPressTask ? () => onPressTask(task) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
});
