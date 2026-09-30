import { AppText } from '@/components/AppText';
import { ScheduleSections } from '@/components/ScheduleSections';
import { Screen } from '@/components/Screen';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectScheduleSections } from '@/mocks/store';

/** 전체 일정 관리: 모든 프로젝트의 작업을 하나의 일정으로 */
export default function ScheduleScreen() {
  const { state, dispatch, today } = useMockStore();
  return (
    <Screen scroll>
      <AppText variant="title">전체 일정</AppText>
      <ScheduleSections sections={selectScheduleSections(state, today)} projects={state.projects} today={today} onToggle={(taskId) => dispatch({ type: 'toggleTask', taskId })} />
    </Screen>
  );
}
