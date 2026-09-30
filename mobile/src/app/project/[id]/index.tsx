import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TaskList } from '@/components/TaskList';
import { dDayLabel, formatDateLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectProjectProgress } from '@/mocks/store';

/** 프로젝트별 상세 정보 + 태스크 확인 */
export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, today } = useMockStore();
  const project = state.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <Screen edges={['bottom']}>
        <AppText>프로젝트를 찾을 수 없어요.</AppText>
      </Screen>
    );
  }

  const tasks = state.tasks.filter((t) => t.projectId === project.id);
  const progress = selectProjectProgress(state, project.id, today);

  return (
    <Screen scroll edges={['bottom']}>
      <AppText variant="title">{project.name}</AppText>
      {project.description ? <AppText tone="secondary">{project.description}</AppText> : null}

      <Card>
        <AppText>{project.deadline ? `마감 ${formatDateLabel(project.deadline)} (${dDayLabel(project.deadline, today)})` : '마감일 미정'}</AppText>
        <AppText tone="secondary">{`${progress.done}/${progress.total} 완료${progress.overdue ? ` · 지연 ${progress.overdue}건` : ''}`}</AppText>
      </Card>

      <Button label="일정 확인" variant="secondary" onPress={() => router.push(`/project/${project.id}/schedule`)} />

      <AppText variant="subtitle">작업</AppText>
      {tasks.length > 0 ? (
        <TaskList
          tasks={tasks}
          projects={state.projects}
          today={today}
          showProject={false}
          onToggle={(taskId) => dispatch({ type: 'toggleTask', taskId })}
          onPressTask={(task) => router.push(`/project/${project.id}/task/${task.id}`)}
        />
      ) : (
        <AppText tone="secondary">작업이 없어요.</AppText>
      )}
    </Screen>
  );
}
