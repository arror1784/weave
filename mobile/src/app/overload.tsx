import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TimeBar } from '@/components/TimeBar';
import { TopBar } from '@/components/TopBar';
import { formatHours } from '@/lib/korean';
import { LoadError, Loading } from '@/components/QueryStatus';
import { selectWeekLoad } from '@/lib/schedule';
import { useSchedule } from '@/queries/schedule';
import { useAppTheme } from '@/theme';

/**
 * 이번 주 과부하 (Figma 04-c): 예상 소요 vs 가용 시간(하루 가용 × 이번 주 남은 날)과 이번 주 작업.
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
  const { estimated, available, tasks } = selectWeekLoad(state, state.today);
  const over = estimated > available;
  const max = Math.max(estimated, available);

  return (
    <Screen header={<TopBar title="이번 주" onBack={() => router.back()} />} contentStyle={styles.content}>
      <View style={styles.heading}>
        <View style={[styles.warnIcon, { backgroundColor: over ? colors.warnSoft : colors.threadSoft, borderRadius: radius.card }]}>
          <IconWarn size={22} color={over ? colors.warn : colors.thread} />
        </View>
        <View>
          <AppText variant="sheetTitle" color={over ? colors.warnText : colors.ink} style={styles.title}>
            {over ? '이번 주 과부하' : '이번 주는 여유가 있어요'}
          </AppText>
          <AppText variant="bodyRegular" tone="soft">
            {over ? '시간이 물리적으로 부족해요.' : '가용 시간 안에서 진행하고 있어요.'}
          </AppText>
        </View>
      </View>

      <Card style={styles.card}>
        <TimeBar label="예상 소요" hours={estimated} max={max} color={over ? colors.warn : colors.thread} textColor={over ? colors.warnText : colors.thread} />
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <TimeBar label="가용 시간" hours={available} max={max} color={colors.inkSoft} textColor={colors.inkSoft} />
        {over ? (
          <AppText variant="caption" color={colors.warnText} style={styles.center}>
            {`${Number((estimated - available).toFixed(2))}시간이 초과됐어요.`}
          </AppText>
        ) : null}
      </Card>

      <View>
        <AppText variant="label">이번 주 작업</AppText>
        <AppText variant="caption" tone="soft" style={styles.sub}>
          밀린 작업과 오늘부터 일요일까지 할 작업이에요. 시간이 많이 드는 순서예요.
        </AppText>
        <View style={styles.list}>
          {tasks.map((t) => {
            const project = state.projects.find((p) => p.id === t.projectId)!;
            return (
              <View key={t.id} accessible accessibilityLabel={`${t.title}, ${formatHours(t.estimatedHours ?? 0)}, ${project.name}`} style={[styles.item, { borderRadius: radius.card, borderColor: colors.line, backgroundColor: colors.surface }]}>
                <View style={styles.flex}>
                  <Badge project={project} small />
                  <AppText variant="small" style={styles.itemTitle}>
                    {t.title}
                  </AppText>
                </View>
                <AppText variant="mono" tone="soft">
                  {formatHours(t.estimatedHours ?? 0)}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20 },
  card: { padding: 16 },
  divider: { height: 1, marginVertical: 12 },
  center: { textAlign: 'center', marginTop: 12 },
  sub: { marginTop: 2, marginBottom: 12 },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  flex: { flex: 1, gap: 6 },
  itemTitle: { fontSize: 14 },
});
