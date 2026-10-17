import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconChevron, IconPlus, IconWarn } from '@/components/icons';
import { LoadError, Loading } from '@/components/QueryStatus';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { TaskCard } from '@/components/TaskCard';
import { formatDateLabel, formatMonthEyebrow } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { selectDayEvents, selectTodayTasks, selectTodayWork } from '@/lib/schedule';
import { useSchedule } from '@/queries/schedule';
import { useToggleTask } from '@/queries/use-toggle-task';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/** 오늘의 일정 (Figma 02-a): 날짜·남은 일 / 오늘 작업량(과부하) 카드 / 오늘 할 일 / 새 프로젝트 버튼. Figma의 고정 일정 구역은 뺐다(사용자 결정 G — 고정 일정은 나중에) */
export default function TodayScreen() {
  const router = useRouter();
  const { colors, typography, radius } = useAppTheme();
  const schedule = useSchedule();
  const data = schedule.data;
  const toggle = useToggleTask((id) => data?.projects.find((p) => p.id === id)?.name ?? '');

  const fab = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="새 프로젝트 등록"
      onPress={() => router.push('/project/new')}
      style={({ pressed }) => [styles.fab, { backgroundColor: colors.thread, borderRadius: radius.card }, pressed && styles.pressed]}>
      <IconPlus size={24} color={colors.onThread} />
    </Pressable>
  );

  if (!data) {
    return (
      <Screen contentStyle={styles.content} overlay={fab}>
        {schedule.isError ? <LoadError error={schedule.error} onRetry={() => schedule.refetch()} /> : <Loading />}
      </Screen>
    );
  }

  const today = data.today;
  const tasks = selectTodayTasks(data, today);
  const left = tasks.filter((t) => !t.done).length;
  const work = selectTodayWork(data, today);
  const events = selectDayEvents(data, today);
  const accent = work.over ? colors.warn : colors.thread;
  const scale = Math.max(work.total, work.capacity);
  const pct = (h: number) => `${Math.min(100, (h / scale) * 100)}%` as const;
  const [date, weekday] = splitWeekday(formatDateLabel(today));

  return (
    <Screen
      contentStyle={styles.content}
      overlay={fab
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

      {/* 오늘 작업량 — 작업을 다 끝내도 남긴다. 총량이 가용을 넘으면 과부하로 보인다(사용자 결정 2026-10-01) */}
      {work.total > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${work.over ? '과부하' : '오늘 작업'}, ${work.total}시간 / 가용 ${work.capacity}시간, 완료 ${work.done}시간, 이번 주 보기`}
          onPress={() => router.push('/overload')}
          style={({ pressed }) => [styles.overload, { backgroundColor: work.over ? colors.warnSoft : colors.surface, borderRadius: radius.card }, !work.over && { borderWidth: 1, borderColor: colors.line }, pressed && styles.pressedCard]}>
          <View style={styles.inline}>
            {work.over ? <IconWarn size={16} color={colors.warn} /> : null}
            <AppText variant="label" color={work.over ? colors.warnText : colors.ink} style={styles.small}>
              {work.over ? '과부하' : '오늘 작업'}
            </AppText>
            <AppText variant="monoBold" style={styles.overloadHours}>
              {formatHours(work.total)} <Text style={{ color: colors.inkSoft }}>{`/ 가용 ${formatHours(work.capacity)}`}</Text>
            </AppText>
          </View>
          {/* 막대: 전체 길이 = 총량과 가용 중 큰 값. 진한 부분이 완료, 옅은 부분이 남은 시간, 세로선이 가용 시간 */}
          <View style={[styles.track, { backgroundColor: work.over ? colors.surface : colors.canvas }]}>
            <View style={[styles.fill, { width: pct(work.total), backgroundColor: accent, opacity: 0.35 }]} />
            <View style={[styles.fill, { width: pct(work.done), backgroundColor: accent }]} />
            {work.over ? <View style={[styles.capacity, { left: pct(work.capacity), backgroundColor: colors.ink }]} /> : null}
          </View>
          <View style={[styles.inline, styles.between]}>
            <AppText variant="caption" color={work.over ? colors.warnText : colors.inkSoft}>
              {[`완료 ${formatHours(work.done)}`, `남은 ${formatHours(work.remaining)}`, work.over ? `${formatHours(work.total - work.capacity)} 초과` : null].filter(Boolean).join(' · ')}
            </AppText>
            <IconChevron size={14} color={work.over ? colors.warnText : colors.inkSoft} />
          </View>
        </Pressable>
      ) : null}

      {/* 오늘 개인 일정(사용자 결정 2026-10-17 — 입력한 수업·모임을 보여준다). 없으면 칸을 숨긴다 */}
      {events.length > 0 ? (
        <View accessible={false} accessibilityLabel="오늘 일정">
          <SectionLabel>오늘 일정</SectionLabel>
          <View style={styles.list}>
            {events.map((e) => (
              <View key={`${e.eventId}-${e.startTime}`} style={[styles.event, { borderColor: colors.line, borderRadius: radius.card, backgroundColor: colors.surface }]}>
                <AppText variant="mono" tone="soft">{`${e.startTime}~${e.endTime}`}</AppText>
                <AppText variant="small" style={styles.flex}>
                  {e.title}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <SectionLabel>오늘 할 일</SectionLabel>
        {tasks.length === 0 ? (
          <AppText tone="soft">오늘 예정된 작업이 없어요.</AppText>
        ) : (
          <View style={styles.list}>
            {tasks.map((task) => {
              const project = data.projects.find((p) => p.id === task.projectId)!;
              const dep = task.dependsOnId ? data.tasks.find((t) => t.id === task.dependsOnId) : undefined;
              return <TaskCard key={task.id} task={task} project={project} today={today} blockedBy={dep && !dep.done ? dep.title : undefined} onToggle={() => toggle(task)} />;
            })}
          </View>
        )}
      </View>

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
  flex: { flex: 1 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { justifyContent: 'space-between' },
  small: { fontSize: 14 },
  overloadHours: { marginLeft: 'auto', fontSize: 14 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  capacity: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  list: { gap: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  pressed: { transform: [{ scale: 0.95 }] },
  pressedCard: { transform: [{ scale: 0.99 }] },
});
