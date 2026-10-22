import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { datesBetween, dayOfMonth, formatDateLabel, monthGrid, monthOf, startOfMonthShift, type DateKey } from '@/lib/date';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconBack, IconCal, IconChevron } from './icons';

const WEEK = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 날짜 입력칸 — 누르면 달력 시트가 열린다(사용자 결정 2026-10-01: 마감일은 날짜 선택으로).
 * 보이는 라벨과 고른 날짜(없으면 emptyText)를 스크린리더가 함께 읽는다. display가 있으면 날짜 대신 그 글자(예: 여러 날짜 요약).
 */
export function DateField({
  label,
  value,
  display,
  emptyText,
  onPress,
  accessory,
}: {
  label: string;
  value: DateKey | null;
  display?: string;
  emptyText: string;
  onPress: () => void;
  accessory?: ReactNode;
}) {
  const shown = display ?? value;
  const { colors, radius, typography } = useAppTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="fieldLabel" tone="soft">
        {label}
      </AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${display ?? (value ? formatDateLabel(value) : emptyText)}`}
          onPress={onPress}
          style={({ pressed }) => [styles.field, { borderColor: colors.control, borderRadius: radius.control, backgroundColor: pressed ? colors.canvas : colors.surface }]}>
          <AppText style={[shown ? [typography.mono, styles.monoSize] : typography.body, styles.flex]} color={shown ? colors.ink : colors.inkSoft}>
            {shown ?? emptyText}
          </AppText>
          <IconCal size={18} color={colors.inkSoft} />
        </Pressable>
        {accessory}
      </View>
    </View>
  );
}

/**
 * 달력 시트 — 오늘 이전 날짜도 고를 수 있다(사용자 결정 2026-10-17). today는 오늘 표시와 처음 열리는 달에 쓴다.
 * onClear가 있으면 "날짜 없음" 버튼을 보인다(마감 없음 = 상시).
 */
export function DatePickerSheet({
  title,
  value,
  today,
  onSelect,
  onClear,
  clearLabel,
  onClose,
}: {
  title: string;
  value: DateKey | null;
  today: DateKey;
  onSelect: (date: DateKey) => void;
  onClear?: () => void;
  clearLabel?: string;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible onClose={onClose} label={title}>
      <AppText variant="sheetTitle">{title}</AppText>
      <MonthCalendar today={today} initial={value ?? today} isSelected={(d) => d === value} onPress={onSelect} />
      {onClear && clearLabel ? <Button label={clearLabel} variant="soft" onPress={onClear} /> : null}
    </BottomSheet>
  );
}

/**
 * 여러 날 고르기 시트(사용자 결정 2026-10-23 — 개인 일정 '날짜 지정'). 날짜를 누를 때마다 넣고 빼며,
 * '기간으로 고르기'를 누른 뒤 처음과 끝을 누르면 그 사이 날짜를 모두 넣는다. '고르기 끝'으로 확정한다.
 */
export function MultiDatePickerSheet({ title, value, today, onDone, onClose }: { title: string; value: DateKey[]; today: DateKey; onDone: (dates: DateKey[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<DateKey[]>(value);
  const [range, setRange] = useState<'off' | 'start' | DateKey>('off');
  const sorted = (list: DateKey[]) => [...new Set(list)].sort();

  function press(d: DateKey) {
    if (range === 'start') {
      setSelected((list) => sorted([...list, d]));
      setRange(d);
      return;
    }
    if (range !== 'off') {
      setSelected((list) => sorted([...list, ...datesBetween(range, d)]));
      setRange('off');
      return;
    }
    setSelected((list) => (list.includes(d) ? list.filter((x) => x !== d) : sorted([...list, d])));
  }

  return (
    <BottomSheet visible onClose={onClose} label={title}>
      <AppText variant="sheetTitle">{title}</AppText>
      <AppText variant="small" tone="soft">
        {range === 'start' ? '기간의 처음 날짜를 눌러 주세요.' : range !== 'off' ? '기간의 마지막 날짜를 눌러 주세요.' : `${selected.length}일 골랐어요. 고른 날을 다시 누르면 빠져요.`}
      </AppText>
      <MonthCalendar today={today} initial={value[0] ?? today} isSelected={(d) => selected.includes(d)} onPress={press} />
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label="기간으로 고르기" variant="soft" onPress={() => setRange('start')} />
        </View>
        <View style={styles.flex}>
          <Button label="고르기 끝" onPress={() => onDone(selected)} />
        </View>
      </View>
    </BottomSheet>
  );
}

/** 달 넘기기 + 날짜 칸 — 한 날짜 시트와 여러 날 시트가 함께 쓴다 */
function MonthCalendar({ today, initial, isSelected, onPress }: { today: DateKey; initial: DateKey; isSelected: (d: DateKey) => boolean; onPress: (d: DateKey) => void }) {
  const { colors, radius } = useAppTheme();
  const [month, setMonth] = useState(() => startOfMonthShift(initial, 0));

  return (
    <>
      <View style={styles.nav}>
        <NavButton label="이전 달" onPress={() => setMonth(startOfMonthShift(month, -1))} icon={(c) => <IconBack size={18} color={c} />} />
        <AppText variant="label" accessibilityRole="header">{`${month.slice(0, 4)}년 ${monthOf(month)}월`}</AppText>
        <NavButton label="다음 달" onPress={() => setMonth(startOfMonthShift(month, 1))} icon={(c) => <IconChevron size={18} color={c} />} />
      </View>
      <View>
        <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {WEEK.map((w) => (
            <AppText key={w} variant="caption" tone="soft" style={styles.cellText}>
              {w}
            </AppText>
          ))}
        </View>
        <View style={styles.grid}>
          {monthGrid(month).map((d, i) => {
            if (!d) return <View key={`empty-${i}`} style={styles.cell} />;
            const selected = isSelected(d);
            const isToday = d === today;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateLabel(d)}${isToday ? ', 오늘' : ''}`}
                accessibilityState={{ selected }}
                onPress={() => onPress(d)}
                style={styles.cell}>
                <View style={[styles.day, { borderRadius: radius.control }, selected && { backgroundColor: colors.thread }, !selected && isToday && { borderWidth: 1, borderColor: colors.thread }]}>
                  <AppText variant="mono" style={styles.dayText} color={selected ? colors.onThread : colors.ink}>
                    {String(dayOfMonth(d))}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );

  function NavButton({ label, onPress: press, icon }: { label: string; onPress: () => void; icon: (color: string) => ReactNode }) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={press} style={styles.navButton}>
        {icon(colors.ink)}
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  monoSize: { fontSize: 15, lineHeight: 20 },
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  cellText: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  day: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8 },
});
