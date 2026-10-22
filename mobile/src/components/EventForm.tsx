import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { NewPersonalEvent } from '@/api/events';
import type { PersonalEvent } from '@/api/types';
import { formatShortDate, type DateKey } from '@/lib/date';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { DateField, DatePickerSheet, MultiDatePickerSheet } from './DatePicker';
import { Footer } from './Footer';
import { Screen } from './Screen';
import { Segmented } from './Segmented';
import { TextField } from './TextField';
import { minutesToText, parseTime, TimeField } from './TimeField';
import { TopBar } from './TopBar';

const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

/** 매주 반복 · 날짜 지정(여러 날, 같은 시각) · 이어진 일정(시작 날짜·시각 ~ 끝 날짜·시각) — 사용자 결정 2026-10-23 */
type Kind = 'weekly' | 'dates' | 'span';

type Picking = 'dates' | 'startDate' | 'endDate' | 'spanStart' | 'spanEnd' | null;

const kindOf = (e: PersonalEvent): Kind => (e.repeat === 'weekly' ? 'weekly' : e.untilDate ? 'span' : 'dates');

/** 날짜 지정 요약: '9/22 · 9/29' (네 개 이상이면 '… 외 n일') */
export function datesSummary(dates: DateKey[]): string {
  const shown = dates.slice(0, dates.length > 3 ? 3 : dates.length).map(formatShortDate).join(' · ');
  return dates.length > 3 ? `${shown} 외 ${dates.length - 3}일` : shown;
}

/**
 * 개인 일정 추가·수정 화면이 함께 쓰는 입력(사용자 결정 2026-10-17, 2026-10-23 수정·종류 3개·시각 직접 입력).
 * 끝 시각이 시작보다 이르면 하루짜리 일정은 다음 날까지(자정 넘김, 2026-10-18). 검증은 서버도 다시 한다.
 */
export function EventForm({
  title: screenTitle,
  initial,
  today,
  pending,
  serverError,
  onSubmit,
  onBack,
}: {
  title: string;
  initial?: PersonalEvent;
  today: DateKey;
  pending: boolean;
  serverError: string | null;
  onSubmit: (event: NewPersonalEvent) => void;
  onBack: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Kind>(initial ? kindOf(initial) : 'weekly');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [dates, setDates] = useState<DateKey[]>(initial ? (initial.dates.length > 0 ? initial.dates : initial.date ? [initial.date] : []) : []);
  const [spanStart, setSpanStart] = useState<DateKey | null>(initial?.untilDate ? initial.date : null);
  const [spanEnd, setSpanEnd] = useState<DateKey | null>(initial?.untilDate ?? null);
  const [startDate, setStartDate] = useState<DateKey | null>(initial?.startDate ?? null);
  const [endDate, setEndDate] = useState<DateKey | null>(initial?.endDate ?? null);
  const [start, setStart] = useState(initial ? (parseTime(initial.startTime) ?? 9 * 60) : 9 * 60);
  const [end, setEnd] = useState(initial ? (parseTime(initial.endTime) ?? 10 * 60) : 10 * 60);
  const [picking, setPicking] = useState<Picking>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => setWeekdays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort()));

  function save() {
    const startText = minutesToText(start);
    const endText = minutesToText(end);
    const problem = !title.trim()
      ? '일정 이름을 적어 주세요.'
      : kind === 'weekly' && weekdays.length === 0
        ? '반복할 요일을 하나 이상 골라 주세요.'
        : kind === 'dates' && dates.length === 0
          ? '날짜를 골라 주세요.'
          : kind === 'span' && !spanStart
            ? '시작 날짜를 골라 주세요.'
            : kind === 'span' && !spanEnd
              ? '끝나는 날짜를 골라 주세요.'
              : kind === 'span' && `${spanEnd}T${endText}` <= `${spanStart}T${startText}`
                ? '끝나는 날짜·시각이 시작보다 뒤여야 해요.'
                : kind !== 'span' && end === start
                  ? '끝나는 시각이 시작 시각과 같아요.'
                  : null;
    setError(problem);
    if (problem) return;
    const onceDates = kind === 'dates' ? dates : kind === 'span' && spanStart ? [spanStart] : [];
    onSubmit({
      title: title.trim(),
      repeat: kind === 'weekly' ? 'weekly' : 'once',
      weekdays: kind === 'weekly' ? weekdays : [],
      date: onceDates[0] ?? null,
      dates: onceDates,
      untilDate: kind === 'span' ? spanEnd : null,
      startTime: startText,
      endTime: endText,
      startDate: kind === 'weekly' ? startDate : null,
      endDate: kind === 'weekly' ? endDate : null,
    });
  }

  const single: Record<Exclude<Picking, 'dates' | null>, { title: string; value: DateKey | null; set: (d: DateKey | null) => void; clear?: string }> = {
    startDate: { title: '반복 시작일', value: startDate, set: setStartDate, clear: '처음부터' },
    endDate: { title: '반복 종료일', value: endDate, set: setEndDate, clear: '계속 반복' },
    spanStart: { title: '시작 날짜', value: spanStart, set: setSpanStart },
    spanEnd: { title: '끝나는 날짜', value: spanEnd, set: setSpanEnd },
  };
  const sheet = picking && picking !== 'dates' ? single[picking] : null;

  return (
    <Screen
      header={<TopBar title={screenTitle} onBack={onBack} />}
      contentStyle={styles.content}
      footer={
        <Footer>
          {serverError ? (
            <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
              <AppText variant="small" color={colors.dangerText}>
                {serverError}
              </AppText>
            </View>
          ) : null}
          <Button label="저장" onPress={save} disabled={pending} />
        </Footer>
      }
      overlay={
        picking === 'dates' ? (
          <MultiDatePickerSheet
            title="날짜"
            value={dates}
            today={today}
            onDone={(list) => {
              setDates(list);
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
        ) : sheet ? (
          <DatePickerSheet
            title={sheet.title}
            value={sheet.value}
            today={today}
            onSelect={(d) => {
              sheet.set(d);
              setPicking(null);
            }}
            {...(sheet.clear
              ? {
                  clearLabel: sheet.clear,
                  onClear: () => {
                    sheet.set(null);
                    setPicking(null);
                  },
                }
              : {})}
            onClose={() => setPicking(null)}
          />
        ) : null
      }
    >
      <TextField label="일정 이름" placeholder="예: 운영체제 수업, 동아리 회식" value={title} onChangeText={setTitle} />
      <Segmented
        options={[
          { value: 'weekly', label: '매주 반복' },
          { value: 'dates', label: '날짜 지정' },
          { value: 'span', label: '이어진 일정' },
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === 'weekly' ? (
        <>
          <View>
            <AppText variant="fieldLabel" tone="soft">
              요일
            </AppText>
            <View style={styles.days}>
              {WEEKDAYS.map((label, i) => {
                const day = i + 1;
                const on = weekdays.includes(day);
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="checkbox"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: on }}
                    onPress={() => toggleDay(day)}
                    style={[styles.day, { borderRadius: radius.control, borderColor: on ? colors.thread : colors.control, backgroundColor: on ? colors.thread : colors.surface }]}
                  >
                    <AppText variant="label" color={on ? colors.onThread : colors.ink}>
                      {label.slice(0, 1)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <DateField label="반복 시작일" value={startDate} emptyText="처음부터" onPress={() => setPicking('startDate')} />
          <DateField label="반복 종료일" value={endDate} emptyText="계속 반복" onPress={() => setPicking('endDate')} />
          <TimeField label="시작 시각" minutes={start} onChange={setStart} />
          <TimeField label="끝나는 시각" minutes={end} onChange={setEnd} nextDay={end < start} />
        </>
      ) : kind === 'dates' ? (
        <>
          <DateField label="날짜" value={null} display={dates.length > 0 ? datesSummary(dates) : undefined} emptyText="날짜를 골라 주세요(여러 날 가능)" onPress={() => setPicking('dates')} />
          <TimeField label="시작 시각" minutes={start} onChange={setStart} />
          <TimeField label="끝나는 시각" minutes={end} onChange={setEnd} nextDay={end < start} />
        </>
      ) : (
        <>
          <DateField label="시작 날짜" value={spanStart} emptyText="날짜를 골라 주세요" onPress={() => setPicking('spanStart')} />
          <TimeField label="시작 시각" minutes={start} onChange={setStart} />
          <DateField label="끝나는 날짜" value={spanEnd} emptyText="날짜를 골라 주세요" onPress={() => setPicking('spanEnd')} />
          <TimeField label="끝나는 시각" minutes={end} onChange={setEnd} />
          <AppText variant="small" tone="soft">
            사이에 낀 날은 하루 종일 작업을 넣지 않아요.
          </AppText>
        </>
      )}
      {error ? (
        <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
          <AppText variant="small" color={colors.dangerText}>
            {error}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 18 },
  days: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  day: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
