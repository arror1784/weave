import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line } from 'react-native-svg';

import { diffInDays, formatShortDate, type DateKey } from '@/lib/date';
import { withParticle } from '@/lib/korean';
import type { Task } from '@/api/types';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

import { AppText } from './AppText';
import { barSpan } from './gantt-layout';
import { Card } from './Card';
import { IconWarn } from './icons';

const NAME_W = 72;
const ROW_H = 44;

type Props = { tasks: Task[]; range: DateKey[]; today: DateKey; color: string };

function isLate(t: Task, today: DateKey) {
  return !t.done && t.scheduledDate !== null && diffInDays(today, t.scheduledDate) + t.spanDays - 1 < 0;
}

/** 프로젝트 일정 (Figma 04-b 간트): 작업 막대 · 오늘 선 · 선행 관계 선 · 밀린 작업 경고 */
export function Gantt({ tasks, range, today, color }: Props) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const col = width / range.length;
  const todayIndex = range.indexOf(today);
  // 범위를 벗어난 부분은 잘라서 그린다 (이름 칸을 덮지 않게)
  const span = (t: Task) => (t.scheduledDate ? barSpan(t.scheduledDate, t.spanDays, range) : null);
  const barX = (t: Task) => (span(t)?.start ?? 0) * col;
  const barW = (t: Task) => (span(t)?.length ?? 0) * col;

  const lateWithDependents = tasks.find((t) => isLate(t, today) && tasks.some((x) => x.dependsOnId === t.id));
  const dependent = lateWithDependents ? tasks.find((x) => x.dependsOnId === lateWithDependents.id) : undefined;

  return (
    <Card style={styles.card}>
      <View style={[styles.headRow, { marginLeft: NAME_W }]}>
        {range.map((d) => (
          <AppText key={d} variant="mono" color={d === today ? colors.thread : colors.inkSoft} style={[styles.headText, d === today && styles.headToday]}>
            {formatShortDate(d)}
          </AppText>
        ))}
      </View>

      <View style={styles.body}>
        {tasks.map((t) => {
          const late = isLate(t, today);
          const status = t.done ? '완료' : late ? '밀림' : '예정';
          const scheduled = t.scheduledDate !== null;
          return (
            <View key={t.id} style={styles.row} accessible accessibilityLabel={scheduled ? `${t.title}, ${formatShortDate(t.scheduledDate!)}부터 ${t.spanDays}일, ${t.estimatedHours ?? 0}시간, ${status}` : `${t.title}, 일정 미배정`}>
              <AppText variant="caption" numberOfLines={1} color={t.done ? colors.inkSoft : colors.ink} style={styles.name}>
                {t.title}
              </AppText>
              <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                {span(t) && width > 0 ? (
                  <View style={[styles.bar, { left: barX(t), width: barW(t), backgroundColor: late ? colors.danger : color, opacity: t.done ? 0.3 : 1 }]}>
                    <AppText variant="monoBold" color={colors.onThread} style={styles.barText} numberOfLines={1}>{`${t.estimatedHours ?? 0}h`}</AppText>
                  </View>
                ) : null}
                {!scheduled ? (
                  <AppText variant="micro" tone="soft" style={styles.unscheduled}>
                    일정 미배정
                  </AppText>
                ) : null}
                {late && span(t) && width > 0 ? (
                  <View style={[styles.warnIcon, { left: barX(t) + barW(t) + 3 }]}>
                    <IconWarn size={13} color={colors.danger} />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}

        {width > 0 ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: NAME_W }]}>
            <Svg width={width} height={tasks.length * ROW_H}>
              {todayIndex >= 0 ? <Line x1={(todayIndex + 0.5) * col} y1={0} x2={(todayIndex + 0.5) * col} y2={tasks.length * ROW_H} stroke={colors.thread} strokeOpacity={0.4} strokeWidth={1} /> : null}
              {tasks.map((t, i) => {
                const j = tasks.findIndex((x) => x.id === t.dependsOnId);
                if (j < 0 || !span(t) || !span(tasks[j])) return null;
                const from = tasks[j];
                const x1 = barX(from) + barW(from);
                const x2 = barX(t);
                const y1 = j * ROW_H + ROW_H / 2 + 12;
                const y2 = i * ROW_H + ROW_H / 2;
                return (
                  <G key={t.id}>
                    <Line x1={x1} y1={y1} x2={x1} y2={y2} stroke={colors.inkSoft} strokeWidth={1.2} strokeDasharray="2 2" />
                    <Line x1={x1} y1={y2} x2={x2} y2={y2} stroke={colors.inkSoft} strokeWidth={1.2} />
                  </G>
                );
              })}
            </Svg>
          </View>
        ) : null}
      </View>

      <View style={[styles.legend, { borderTopColor: colors.line }]}>
        <LegendItem swatch={<View style={[styles.swatch, { backgroundColor: color, opacity: 0.3 }]} />} label="완료" />
        <LegendItem swatch={<View style={[styles.swatch, { backgroundColor: colors.danger }]} />} label="밀림" />
        <LegendItem swatch={<View style={[styles.hline, { backgroundColor: colors.inkSoft }]} />} label="선행 관계" />
        <LegendItem swatch={<View style={[styles.vline, { backgroundColor: colors.thread }]} />} label="오늘" />
      </View>

      {lateWithDependents && dependent ? (
        <View style={[styles.warnBox, { backgroundColor: colors.dangerSoft }]}>
          <AppText variant="caption" color={colors.dangerText}>{`${withParticle(lateWithDependents.title, '이', '가')} 밀려서 ${dependent.title} 시작이 늦어질 수 있어요.`}</AppText>
        </View>
      ) : null}
    </Card>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <AppText variant="caption" tone="soft">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  headRow: { flexDirection: 'row' },
  headText: { flex: 1, textAlign: 'center', fontSize: 9 },
  headToday: { fontFamily: fonts.monoBold },
  body: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', height: ROW_H },
  name: { width: NAME_W, paddingRight: 8 },
  track: { flex: 1, height: '100%', justifyContent: 'center', overflow: 'hidden' },
  bar: { position: 'absolute', height: 24, borderRadius: 6, justifyContent: 'center', paddingHorizontal: 6 },
  barText: { fontSize: 10 },
  unscheduled: { paddingLeft: 4 },
  warnIcon: { position: 'absolute' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 10, borderRadius: 2 },
  hline: { width: 16, height: 1 },
  vline: { width: 1, height: 12 },
  warnBox: { marginTop: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
});
