import { View } from 'react-native';

import { formatDateLabel, type DateKey } from '@/lib/date';
import type { ScheduleSection } from '@/mocks/store';
import type { Project } from '@/mocks/types';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
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
  const { colors, spacing } = useAppTheme();
  if (sections.length === 0) return <AppText tone="secondary">예정된 작업이 없어요.</AppText>;
  return (
    <View style={{ gap: spacing.lg }}>
      {sections.map((section) => {
        const overdue = section.key === 'overdue';
        return (
          <View key={section.key} style={{ gap: spacing.sm }}>
            <AppText variant="subtitle" style={overdue ? { color: colors.danger } : section.key === today ? { color: colors.primary } : undefined}>
              {sectionTitle(section.key, today)}
            </AppText>
            <Card tone={overdue ? 'danger' : 'default'} style={{ paddingVertical: spacing.xs }}>
              <TaskList tasks={section.tasks} projects={projects} today={today} onToggle={onToggle} showProject={showProject} overdue={overdue} />
            </Card>
          </View>
        );
      })}
    </View>
  );
}
