import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TaskList } from '@/components/TaskList';
import { formatDateLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectOverdueTasks, selectTasksOn } from '@/mocks/store';

/** 오늘의 일정: 밀린 작업 + 오늘 할 일(완료 체크) */
export default function TodayScreen() {
  const router = useRouter();
  const { state, dispatch, today } = useMockStore();
  const overdue = selectOverdueTasks(state, today);
  const todayTasks = selectTasksOn(state, today);
  const toggle = (taskId: string) => dispatch({ type: 'toggleTask', taskId });

  return (
    <Screen scroll>
      <AppText variant="title">{formatDateLabel(today)}</AppText>

      {overdue.length > 0 ? (
        <Card tone="danger">
          <AppText variant="subtitle">{`밀린 작업 ${overdue.length}건`}</AppText>
          <TaskList tasks={overdue} projects={state.projects} today={today} onToggle={toggle} overdue />
        </Card>
      ) : null}

      <AppText variant="subtitle">오늘 할 일</AppText>
      {todayTasks.length > 0 ? (
        <TaskList tasks={todayTasks} projects={state.projects} today={today} onToggle={toggle} />
      ) : (
        <AppText tone="secondary">오늘 예정된 작업이 없어요.</AppText>
      )}

      <Button label="새 프로젝트 등록" onPress={() => router.push('/project/new')} />
    </Screen>
  );
}
