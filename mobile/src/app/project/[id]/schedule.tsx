import { useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/AppText';
import { ScheduleSections } from '@/components/ScheduleSections';
import { Screen } from '@/components/Screen';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectScheduleSections } from '@/mocks/store';

/** 프로젝트별 일정 확인 */
export default function ProjectScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, today } = useMockStore();
  const project = state.projects.find((p) => p.id === id);

  return (
    <Screen scroll edges={['bottom']}>
      <AppText variant="title">{project?.name ?? '프로젝트'}</AppText>
      <ScheduleSections sections={selectScheduleSections(state, today, id)} projects={state.projects} today={today} showProject={false} onToggle={(taskId) => dispatch({ type: 'toggleTask', taskId })} />
    </Screen>
  );
}
