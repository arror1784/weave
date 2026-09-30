import { View } from 'react-native';

import { formatDateLabel, type DateKey } from '@/lib/date';
import type { ScheduleSection } from '@/mocks/store';
import type { Project } from '@/mocks/types';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { TaskList } from './TaskList';

function sectionTitle(key: ScheduleSection['key'], today: DateKey): string {
  if (key === 'overdue') return '밀린 작업';
  if (key === 'unscheduled') return '일정 미배정';
  return key === today ? `오늘 · ${formatDateLabel(key)}` : formatDateLabel(key);
}

type Props = {
  sections: ScheduleSection[];
  projects: Project[];
  today: DateKey;
  onToggle: (taskId: string) => void;
  showProject?: boolean;
};

export function ScheduleSections({ sections, projects, today, onToggle, showProject = true }: Props) {
  const { spacing } = useAppTheme();
  if (sections.length === 0) return <AppText tone="secondary">예정된 작업이 없어요.</AppText>;
  return (
    <View style={{ gap: spacing.lg }}>
      {sections.map((section) => (
        <View key={section.key} style={{ gap: spacing.xs }}>
          <AppText variant="subtitle">{sectionTitle(section.key, today)}</AppText>
          <TaskList tasks={section.tasks} projects={projects} today={today} onToggle={onToggle} showProject={showProject} overdue={section.key === 'overdue'} />
        </View>
      ))}
    </View>
  );
}
