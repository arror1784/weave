import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ProjectRow } from '@/components/ProjectRow';
import { Screen } from '@/components/Screen';
import { dDayLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectProjectProgress } from '@/mocks/store';
import { useAppTheme } from '@/theme';
import { threadColorFor } from '@/theme/colors';

export default function ProjectsScreen() {
  const router = useRouter();
  const { spacing } = useAppTheme();
  const { state, today } = useMockStore();

  return (
    <Screen scroll>
      <AppText variant="title">프로젝트</AppText>
      {state.projects.length === 0 ? <AppText tone="secondary">등록된 프로젝트가 없어요. 첫 프로젝트를 등록해 보세요.</AppText> : null}
      <View style={{ gap: spacing.sm + 4 }}>
        {state.projects.map((project) => {
          const progress = selectProjectProgress(state, project.id, today);
          const parts = [`${progress.done}/${progress.total} 완료`, project.deadline ? `마감 ${dDayLabel(project.deadline, today)}` : '마감일 미정'];
          if (progress.overdue > 0) parts.push(`지연 ${progress.overdue}건`);
          return (
            <ProjectRow
              key={project.id}
              threadColor={threadColorFor(project.id, state.projects)}
              name={project.name}
              summary={parts.join(' · ')}
              done={progress.done}
              total={progress.total}
              overdue={progress.overdue}
              onPress={() => router.push(`/project/${project.id}`)}
            />
          );
        })}
      </View>
      <Button label="새 프로젝트 등록" onPress={() => router.push('/project/new')} />
    </Screen>
  );
}
