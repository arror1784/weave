import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { dDayLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectProjectProgress } from '@/mocks/store';

export default function ProjectsScreen() {
  const router = useRouter();
  const { state, today } = useMockStore();

  return (
    <Screen scroll>
      <AppText variant="title">프로젝트</AppText>
      {state.projects.length === 0 ? <AppText tone="secondary">등록된 프로젝트가 없어요.</AppText> : null}
      <View>
        {state.projects.map((project) => {
          const progress = selectProjectProgress(state, project.id, today);
          const parts = [`${progress.done}/${progress.total} 완료`, project.deadline ? `마감 ${dDayLabel(project.deadline, today)}` : '마감일 미정'];
          if (progress.overdue > 0) parts.push(`지연 ${progress.overdue}건`);
          return <ListItem key={project.id} title={project.name} subtitle={parts.join(' · ')} onPress={() => router.push(`/project/${project.id}`)} />;
        })}
      </View>
      <Button label="새 프로젝트 등록" onPress={() => router.push('/project/new')} />
    </Screen>
  );
}
