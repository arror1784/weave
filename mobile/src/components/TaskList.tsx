import { View } from 'react-native';

import { dDayLabel, type DateKey } from '@/lib/date';
import type { Project, Task } from '@/mocks/types';
import { useAppTheme } from '@/theme';

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

export function TaskList({ tasks, projects, today, onToggle, onPressTask, showProject = true, overdue = false }: TaskListProps) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {tasks.map((task) => {
        const parts: string[] = [];
        if (showProject) parts.push(projects.find((p) => p.id === task.projectId)?.name ?? '');
        if (overdue && task.scheduledDate) parts.push(dDayLabel(task.scheduledDate, today));
        if (!showProject && task.estimatedHours !== null) parts.push(`${task.estimatedHours}시간`);
        return (
          <TaskRow
            key={task.id}
            title={task.title}
            meta={parts.filter(Boolean).join(' · ') || undefined}
            done={task.done}
            tone={overdue ? 'danger' : 'default'}
            onToggle={() => onToggle(task.id)}
            onPress={onPressTask ? () => onPressTask(task) : undefined}
          />
        );
      })}
    </View>
  );
}
