import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TimeBar } from '@/components/TimeBar';
import { TopBar } from '@/components/TopBar';
import { formatDateLabel } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { LoadError, Loading } from '@/components/QueryStatus';
import { selectWeekDays } from '@/lib/schedule';
import { useSchedule } from '@/queries/schedule';
import { useAppTheme } from '@/theme';

/**
 * 이번 주 과부하 (Figma 04-c): 오늘부터 일요일까지 날마다 그날 소요 vs 하루 가용 시간과 그날 할 작업.
 * Figma의 주간 합계 비교(예상 소요 vs 이번 주 가용)는 날짜별 비교로 바꿨다 — 사용자 결정(2026-10-01).
 * Figma의 "작업을 다음 주로 미루기"는 뺐다 — 일정은 알고리즘이 정하고 사용자가 바꾸지 않는다(사용자 결정 B-2, 나중에 다시 넣을 수 있음).
 */
export default function OverloadScreen() {
  const router = useRouter();
  const { colors, radius } = useAppTheme();
  const schedule = useSchedule();
  if (!schedule.data) {
    return (
      <Screen header={<TopBar title="이번 주" onBack={() => router.back()} />} contentStyle={styles.content}>
        {schedule.isError ? <LoadError error={schedule.error} onRetry={() => schedule.refetch()} /> : <Loading />}
      </Screen>
    );
  }
  const state = schedule.data;
  const days = selectWeekDays(state, state.today);
  const overDays = days.filter((d) => d.over).length;
  const capacity = state.dailyAvailableHours;
  const max = Math.max(capacity, ...days.map((d) => d.hours));

  return (
    <Screen header={<TopBar title="이번 주" onBack={() => router.back()} />} contentStyle={styles.content}>
      <View style={styles.heading}>
        <View style={[styles.warnIcon, { backgroundColor: overDays ? colors.warnSoft : colors.threadSoft, borderRadius: radius.card }]}>
          <IconWarn size={22} color={overDays ? colors.warn : colors.thread} />
        </View>
        <View style={styles.flex}>
          <AppText variant="sheetTitle" accessibilityRole="header" color={overDays ? colors.warnText : colors.ink} style={styles.title}>
            {overDays ? '이번 주 과부하' : '이번 주는 여유가 있어요'}
          </AppText>
          <AppText variant="bodyRegular" tone="soft">
            {overDays ? `하루 가용 ${formatHours(capacity)}를 넘는 날이 ${overDays}일 있어요.` : `매일 하루 가용 ${formatHours(capacity)} 안에서 진행하고 있어요.`}
          </AppText>
        </View>
      </View>

      {days.map((day) => {
        const label = `${day.date === state.today ? '오늘 ' : ''}${formatDateLabel(day.date)}`;
        return (
          <Card key={day.date} testID={`day-${day.date}`} style={styles.card}>
            <TimeBar label={label} hours={day.hours} max={max} color={day.over ? colors.warn : colors.thread} textColor={day.over ? colors.warnText : colors.thread} />
            {day.over ? (
              <AppText variant="caption" color={colors.warnText} style={styles.excess}>
                {`${formatHours(day.hours - day.capacity)} 초과`}
              </AppText>
            ) : null}
            <View style={styles.list}>
              {day.tasks.length === 0 ? (
                <AppText variant="caption" tone="soft">
                  할 작업이 없어요.
                </AppText>
              ) : (
                day.tasks.map(({ task, hours }) => {
                  const project = state.projects.find((p) => p.id === task.projectId)!;
                  return (
                    <View key={task.id} accessible accessibilityLabel={`${task.title}, ${formatHours(hours)}, ${project.name}`} style={[styles.item, { borderRadius: radius.card, borderColor: colors.line, backgroundColor: colors.surface }]}>
                      <View style={styles.flex}>
                        <Badge project={project} small />
                        <AppText variant="small" style={styles.itemTitle}>
                          {task.title}
                        </AppText>
                      </View>
                      <AppText variant="mono" tone="soft">
                        {formatHours(hours)}
                      </AppText>
                    </View>
                  );
                })
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20 },
  card: { padding: 16 },
  excess: { marginTop: 6 },
  list: { gap: 8, marginTop: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  flex: { flex: 1, gap: 6 },
  itemTitle: { fontSize: 14 },
});
