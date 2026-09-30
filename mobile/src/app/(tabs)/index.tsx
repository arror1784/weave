import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconChevron, IconClock, IconPlus, IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { TaskCard } from '@/components/TaskCard';
import { formatDateLabel, formatMonthEyebrow } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectDayLoad, selectTodayTasks } from '@/mocks/store';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/** 오늘의 일정 (Figma 02-a): 날짜·남은 일 / 과부하 카드 / 오늘 할 일 / 고정 일정 / 새 프로젝트 버튼 */
export default function TodayScreen() {
  const router = useRouter();
  const { colors, typography, radius } = useAppTheme();
  const { state, dispatch, today } = useMockStore();
  const tasks = selectTodayTasks(state, today);
  const left = tasks.filter((t) => !t.done).length;
  const load = selectDayLoad(state, today, { includeOverdue: true });
  const events = state.events.filter((e) => e.date === today);
  const [date, weekday] = splitWeekday(formatDateLabel(today));

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 프로젝트 등록"
          onPress={() => router.push('/project/new')}
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.thread, borderRadius: radius.card }, pressed && styles.pressed]}>
          <IconPlus size={24} color={colors.onThread} />
        </Pressable>
      }>
      <View style={styles.header}>
        <AppText variant="mono" tone="soft">
          {formatMonthEyebrow(today)}
        </AppText>
        <AppText variant="title">
          {date} <Text style={[typography.sheetTitle, { fontFamily: fonts.medium, color: colors.inkSoft }]}>{weekday}</Text>
        </AppText>
        <AppText variant="bodyRegular" tone="soft">
          오늘 <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{`${left}개`}</Text>의 일이 남았어요.
        </AppText>
      </View>

      {load.over ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`과부하, ${load.hours}시간 / 가용 ${load.capacity}시간, 이번 주 과부하 보기`}
          onPress={() => router.push('/overload')}
          style={({ pressed }) => [styles.overload, { backgroundColor: colors.warnSoft, borderRadius: radius.card }, pressed && styles.pressedCard]}>
          <View style={styles.inline}>
            <IconWarn size={16} color={colors.warn} />
            <AppText variant="label" color={colors.warnText} style={styles.small}>
              과부하
            </AppText>
            <AppText variant="monoBold" style={styles.overloadHours}>
              {formatHours(load.hours)} <Text style={{ color: colors.inkSoft }}>{`/ 가용 ${formatHours(load.capacity)}`}</Text>
            </AppText>
          </View>
          <View style={[styles.track, { backgroundColor: colors.surface }]}>
            <View style={[styles.fill, { width: '100%', backgroundColor: colors.warn }]} />
            <View style={[styles.fill, { width: `${(load.capacity / load.hours) * 100}%`, backgroundColor: colors.ink, opacity: 0.8 }]} />
          </View>
          <View style={[styles.inline, styles.between]}>
            <AppText variant="caption" color={colors.warnText}>{`오늘 ${formatHours(load.hours - load.capacity)} 초과 · 이번 주도 확인해보세요`}</AppText>
            <IconChevron size={14} color={colors.warnText} />
          </View>
        </Pressable>
      ) : null}

      <View>
        <SectionLabel>오늘 할 일</SectionLabel>
        {tasks.length === 0 ? (
          <AppText tone="soft">오늘 예정된 작업이 없어요.</AppText>
        ) : (
          <View style={styles.list}>
            {tasks.map((task) => {
              const project = state.projects.find((p) => p.id === task.projectId)!;
              const dep = task.dependsOn ? state.tasks.find((t) => t.id === task.dependsOn) : undefined;
              return <TaskCard key={task.id} task={task} project={project} today={today} blockedBy={dep && !dep.done ? dep.title : undefined} onToggle={() => dispatch({ type: 'toggleTask', taskId: task.id })} />;
            })}
          </View>
        )}
      </View>

      {events.length > 0 ? (
        <View>
          <SectionLabel>일정</SectionLabel>
          <View style={styles.list}>
            {events.map((e) => (
              <View key={e.id} style={[styles.event, { borderColor: colors.control, backgroundColor: colors.surface, borderRadius: radius.card }]}>
                <IconClock size={16} color={colors.inkSoft} />
                <AppText variant="small" style={styles.flex}>
                  {e.title}
                </AppText>
                <AppText variant="mono" tone="soft">{`${e.time} · ${formatHours(e.hours)}`}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** '9월 30일 수요일' → ['9월 30일', '수요일'] */
function splitWeekday(label: string): [string, string] {
  const i = label.lastIndexOf(' ');
  return [label.slice(0, i), label.slice(i + 1)];
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120, gap: 20 },
  header: { gap: 4 },
  overload: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { justifyContent: 'space-between' },
  small: { fontSize: 14 },
  overloadHours: { marginLeft: 'auto', fontSize: 14 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  list: { gap: 8 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 16, paddingVertical: 12 },
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  pressed: { transform: [{ scale: 0.95 }] },
  pressedCard: { transform: [{ scale: 0.99 }] },
});
