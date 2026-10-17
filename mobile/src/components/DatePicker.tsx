import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayOfMonth, formatDateLabel, monthGrid, monthOf, startOfMonthShift, type DateKey } from '@/lib/date';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconBack, IconCal, IconChevron } from './icons';

const WEEK = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 날짜 입력칸 — 누르면 달력 시트가 열린다(사용자 결정 2026-10-01: 마감일은 날짜 선택으로).
 * 보이는 라벨과 고른 날짜(없으면 emptyText)를 스크린리더가 함께 읽는다.
 */
export function DateField({ label, value, emptyText, onPress, accessory }: { label: string; value: DateKey | null; emptyText: string; onPress: () => void; accessory?: ReactNode }) {
  const { colors, radius, typography } = useAppTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="fieldLabel" tone="soft">
        {label}
      </AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${value ? formatDateLabel(value) : emptyText}`}
          onPress={onPress}
          style={({ pressed }) => [styles.field, { borderColor: colors.control, borderRadius: radius.control, backgroundColor: pressed ? colors.canvas : colors.surface }]}>
          <AppText style={[value ? [typography.mono, styles.monoSize] : typography.body, styles.flex]} color={value ? colors.ink : colors.inkSoft}>
            {value ?? emptyText}
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
  const { colors, radius } = useAppTheme();
  const [month, setMonth] = useState(() => startOfMonthShift(value ?? today, 0));

  return (
    <BottomSheet visible onClose={onClose} label={title}>
      <AppText variant="sheetTitle">{title}</AppText>
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
            const selected = d === value;
            const isToday = d === today;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateLabel(d)}${isToday ? ', 오늘' : ''}`}
                accessibilityState={{ selected }}
                onPress={() => onSelect(d)}
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
      {onClear && clearLabel ? <Button label={clearLabel} variant="soft" onPress={onClear} /> : null}
    </BottomSheet>
  );

  function NavButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: (color: string) => ReactNode }) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.navButton}>
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
});
