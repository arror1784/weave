import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateHeading } from '@/components/DateHeading';
import { DayWeave } from '@/components/DayWeave';
import { Screen } from '@/components/Screen';
import { TaskList } from '@/components/TaskList';
import { formatDateLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectOverdueTasks, selectTasksOn } from '@/mocks/store';
import { useAppTheme } from '@/theme';

/** 오늘의 일정: 오늘의 진행 띠 + 밀린 작업 + 오늘 할 일(완료 체크) */
export default function TodayScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const { state, dispatch, today } = useMockStore();
  const overdue = selectOverdueTasks(state, today);
  const todayTasks = selectTasksOn(state, today);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const toggle = (taskId: string) => dispatch({ type: 'toggleTask', taskId });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.md }}>
        <DateHeading label={formatDateLabel(today)} />
        {todayTasks.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <DayWeave tasks={todayTasks} projects={state.projects} />
            <AppText variant="caption" tone="secondary" accessible={false}>
              {doneCount === todayTasks.length ? '오늘 할 일을 모두 끝냈어요' : `${todayTasks.length}개 중 ${doneCount}개 완료`}
            </AppText>
          </View>
        ) : null}
      </View>

      {overdue.length > 0 ? (
        <Card tone="danger">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} accessible={false} />
            <AppText variant="subtitle" style={{ color: colors.danger }}>{`밀린 작업 ${overdue.length}건`}</AppText>
          </View>
          <TaskList tasks={overdue} projects={state.projects} today={today} onToggle={toggle} overdue />
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">오늘 할 일</AppText>
        <Card style={{ paddingVertical: spacing.xs }}>
          {todayTasks.length > 0 ? (
            <TaskList tasks={todayTasks} projects={state.projects} today={today} onToggle={toggle} />
          ) : (
            <AppText tone="secondary" style={{ paddingVertical: spacing.md }}>
              오늘 예정된 작업이 없어요.
            </AppText>
          )}
        </Card>
      </View>

      <Button label="새 프로젝트 등록" onPress={() => router.push('/project/new')} />
    </Screen>
  );
}
