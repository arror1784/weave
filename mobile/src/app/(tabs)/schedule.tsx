import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { dayOfMonth, formatDateLabel, formatMonthEyebrow, formatShortDate, monthGrid, monthOf, weekDays, weekdayLabel, type DateKey } from '@/lib/date';
import type { Project } from '@/api/types';
import { LoadError, Loading } from '@/components/QueryStatus';
import { formatHours } from '@/lib/korean';
import { selectDayItems, selectDayLoad, type DayItem } from '@/lib/schedule';
import { useSchedule } from '@/queries/schedule';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';

type CalendarView = 'month' | 'week';

/** 전체 일정 (Figma 03-a 월간 캘린더 / 03-b 주간 타임라인) */
export default function ScheduleScreen() {
  const schedule = useSchedule();
  const [view, setView] = useState<CalendarView>('week');
  const [selected, setSelected] = useState<DateKey | null>(null);

  if (!schedule.data) {
    return (
      <Screen contentStyle={styles.content}>
        <AppText variant="title">전체 일정</AppText>
        {schedule.isError ? <LoadError error={schedule.error} onRetry={() => schedule.refetch()} /> : <Loading />}
      </Screen>
    );
  }
  const state = schedule.data;
  const today = state.today;
  const project = (id: number) => state.projects.find((p) => p.id === id)!;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="mono" tone="soft">
          {formatMonthEyebrow(today)}
        </AppText>
        <AppText variant="title">전체 일정</AppText>
      </View>
      <Segmented
        options={[
          { value: 'month', label: '월간 캘린더' },
          { value: 'week', label: '주간 타임라인' },
        ]}
        value={view}
        onChange={setView}
      />
      <Legend projects={state.projects.filter((p) => p.status === 'active')} />
      {view === 'month' ? <MonthView onPick={setSelected} /> : <WeekView />}
      <BottomSheet visible={selected !== null} onClose={() => setSelected(null)} label={selected ? `${dateOnly(selected)} 일정` : ''}>
        {selected ? <DayDetail date={selected} project={project} /> : null}
      </BottomSheet>
    </Screen>
  );
}

function Legend({ projects }: { projects: Project[] }) {
  return (
    <View style={styles.legend}>
      {projects.map((p) => (
        <View key={p.id} style={styles.inline}>
          <View style={[styles.dot8, { backgroundColor: projectPaletteFor(p.color).dot }]} />
          <AppText variant="caption" tone="soft">
            {p.name}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function MonthView({ onPick }: { onPick: (d: DateKey) => void }) {
  const { colors, radius } = useAppTheme();
  const { state, today } = useLoadedSchedule();
  const cells = monthGrid(today);

  return (
    <Card style={styles.monthCard}>
      <View style={styles.weekHeader}>
        {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
          <AppText key={d} variant="micro" tone="soft" style={styles.cellText}>
            {d}
          </AppText>
        ))}
      </View>
      {/* 주 단위로 줄을 나눈다 — 퍼센트 너비+줄바꿈은 반올림 때문에 한 줄에 6칸만 들어가는 문제가 있었다 */}
      {Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7)).map((week, w) => (
        <View key={w} testID="month-week" style={styles.week}>
          {week.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const items = selectDayItems(state, d);
            const load = selectDayLoad(state, d);
            const due = items.some((x) => x.due);
            const isToday = d === today;
            const label = [formatDateLabel(d), items.length ? `항목 ${items.length}개` : '비어 있음', load.over ? '과부하' : '', due ? '마감일' : ''].filter(Boolean).join(', ');
            return (
              <Pressable key={d} accessibilityRole="button" accessibilityLabel={label} onPress={() => onPick(d)} style={[styles.cell, { borderRadius: radius.control }, load.over && { backgroundColor: colors.warnSoft }]}>
                <View style={[styles.dayNum, due && { backgroundColor: colors.ink }, isToday && !due && { borderWidth: 1.5, borderColor: colors.thread }]}>
                  <AppText variant="mono" color={due ? colors.onThread : colors.ink} style={styles.dayNumText}>
                    {dayOfMonth(d)}
                  </AppText>
                </View>
                <View style={styles.dots}>
                  {items.slice(0, 3).map((x, j) => (
                    <View key={j} style={[styles.dot6, { backgroundColor: projectPaletteFor(state.projects.find((p) => p.id === x.projectId)!.color).dot }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={[styles.monthLegend, { borderTopColor: colors.line }]}>
        <View style={styles.inline}>
          <View style={[styles.square, { backgroundColor: colors.warnSoft }]} />
          <AppText variant="caption" tone="soft">
            과부하
          </AppText>
        </View>
        <View style={styles.inline}>
          <View style={[styles.dot12, { backgroundColor: colors.ink }]} />
          <AppText variant="caption" tone="soft">
            마감일
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function WeekView() {
  const { colors, radius } = useAppTheme();
  const { state, today } = useLoadedSchedule();
  const days = weekDays(today);

  return (
    <View style={styles.weekList}>
      <AppText variant="caption" tone="soft">{`${formatShortDate(days[0])} – ${formatShortDate(days[6])}`}</AppText>
      {days.map((d) => {
        const items = selectDayItems(state, d);
        const load = selectDayLoad(state, d);
        return (
          <View
            key={d}
            accessible
            accessibilityLabel={`${formatDateLabel(d)}, ${load.hours ? `${load.hours}시간` : '비어 있음'}${load.over ? `, ${load.hours - load.capacity}시간 초과` : ''}`}
            style={[styles.weekRow, { borderRadius: radius.card, borderColor: load.over ? colors.warn : colors.line, backgroundColor: load.over ? colors.warnSoft : colors.surface }]}>
            <View style={styles.weekDay}>
              <AppText variant="micro" tone="soft">
                {weekdayLabel(d)}
              </AppText>
              <AppText variant="monoBold" color={d === today ? colors.thread : colors.ink} style={styles.weekDate}>
                {dayOfMonth(d)}
              </AppText>
              <AppText variant="mono" color={load.over ? colors.warnText : colors.inkSoft} style={styles.micro}>
                {load.hours ? formatHours(load.hours) : '—'}
              </AppText>
            </View>
            <View style={styles.weekItems}>
              {load.over ? (
                <View style={styles.inline}>
                  <IconWarn size={12} color={colors.warn} />
                  <AppText variant="micro" color={colors.warnText}>{`${formatHours(load.hours - load.capacity)} 초과`}</AppText>
                </View>
              ) : null}
              {items.length === 0 ? (
                <AppText variant="caption" tone="soft" style={styles.empty}>
                  비어 있음
                </AppText>
              ) : null}
              {items.map((x, j) => (
                <WeekChip key={j} item={x} project={state.projects.find((p) => p.id === x.projectId)!} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WeekChip({ item, project }: { item: DayItem; project: Project }) {
  const { colors } = useAppTheme();
  const palette = projectPaletteFor(project.color);
  return (
    <View style={[styles.chip, { backgroundColor: palette.soft }]}>
      <View style={[styles.dot6, { backgroundColor: palette.dot }]} />
      <AppText variant="small" color={palette.text} numberOfLines={1} style={styles.flex}>
        {item.title}
      </AppText>
      {item.due ? (
        <View style={[styles.ddayTag, { backgroundColor: colors.ink }]}>
          <AppText variant="monoBold" color={colors.onThread} style={styles.tiny}>
            D-DAY
          </AppText>
        </View>
      ) : (
        <AppText variant="mono" color={palette.text} style={styles.micro}>
          {formatHours(item.hours)}
        </AppText>
      )}
    </View>
  );
}

function DayDetail({ date, project }: { date: DateKey; project: (id: number) => Project }) {
  const { colors, radius } = useAppTheme();
  const { state } = useLoadedSchedule();
  const items = selectDayItems(state, date);
  const load = selectDayLoad(state, date);
  return (
    <>
      <View style={[styles.inline, styles.between]}>
        <AppText variant="sheetTitle">{dateOnly(date)}</AppText>
        <AppText variant="monoBold" color={load.over ? colors.warnText : colors.inkSoft} style={styles.sheetHours}>
          {`${formatHours(load.hours)} / ${formatHours(load.capacity)}`}
        </AppText>
      </View>
      {items.length === 0 ? (
        <AppText variant="small" tone="soft" style={styles.sheetEmpty}>
          예정된 작업이 없어요. 여유로운 날!
        </AppText>
      ) : (
        <View style={styles.sheetList}>
          {items.map((x, i) => {
            const p = project(x.projectId);
            return (
              <View key={i} style={[styles.sheetItem, { borderColor: colors.line, borderRadius: radius.control }]}>
                <View style={[styles.sheetBar, { backgroundColor: projectPaletteFor(p.color).dot }]} />
                <View style={styles.flex}>
                  <AppText variant="micro" tone="soft">
                    {p.name}
                  </AppText>
                  <AppText variant="small">{x.title}</AppText>
                </View>
                {x.due ? (
                  <View style={[styles.ddayTag, { backgroundColor: colors.ink }]}>
                    <AppText variant="monoBold" color={colors.onThread} style={styles.tiny}>
                      D-DAY
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="mono" tone="soft">
                    {formatHours(x.hours)}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

/** '9월 30일 수요일' → '9월 30일' */
function dateOnly(d: DateKey) {
  return `${monthOf(d)}월 ${dayOfMonth(d)}일`;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 12 },
  header: { gap: 4, marginBottom: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { justifyContent: 'space-between' },
  dot8: { width: 8, height: 8, borderRadius: 4 },
  dot6: { width: 6, height: 6, borderRadius: 3 },
  dot12: { width: 12, height: 12, borderRadius: 6 },
  square: { width: 12, height: 12, borderRadius: 3 },
  monthCard: { padding: 12 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  cellText: { flex: 1, textAlign: 'center', paddingVertical: 4 },
  week: { flexDirection: 'row', marginBottom: 4 },
  cell: { flex: 1, minHeight: 56, alignItems: 'center', paddingTop: 6 },
  dayNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontSize: 13 },
  dots: { flexDirection: 'row', gap: 2, marginTop: 4 },
  monthLegend: { flexDirection: 'row', gap: 16, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  weekList: { gap: 8 },
  weekRow: { flexDirection: 'row', gap: 12, borderWidth: 1, padding: 12 },
  weekDay: { width: 44, alignItems: 'center' },
  weekDate: { fontSize: 18, lineHeight: 22 },
  weekItems: { flex: 1, gap: 6 },
  empty: { paddingTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ddayTag: { borderRadius: 4, paddingHorizontal: 6 },
  tiny: { fontSize: 10 },
  micro: { fontSize: 11 },
  flex: { flex: 1 },
  sheetHours: { fontSize: 14 },
  sheetEmpty: { textAlign: 'center', paddingVertical: 24 },
  sheetList: { gap: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  sheetBar: { width: 4, height: 32, borderRadius: 2 },
});

/** 하위 화면은 부모가 데이터를 받은 뒤에만 그려진다 — 같은 캐시를 읽는다 */
function useLoadedSchedule() {
  const state = useSchedule().data!;
  return { state, today: state.today };
}
