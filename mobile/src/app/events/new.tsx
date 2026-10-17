import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DateField, DatePickerSheet } from '@/components/DatePicker';
import { Footer } from '@/components/Footer';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import type { DateKey } from '@/lib/date';
import { useCreateEvent } from '@/queries/events';
import { useToday } from '@/queries/use-today';
import { useAppTheme } from '@/theme';

const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
const STEP = 30;
const DAY = 24 * 60;

const toText = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

type Picking = 'date' | 'startDate' | 'endDate' | null;

/**
 * 개인 일정 추가(사용자 결정 2026-10-17): 이름 + 시작~끝 시각 + 매주 반복(요일, 기간 — 비우면 계속) 또는 한 번(날짜).
 * 시각은 30분 단위 −/+ (시각 고르기 네이티브 모듈 없이). 끝이 시작보다 이르면 다음 날까지(자정 넘김, 2026-10-18). 검증은 서버도 다시 한다.
 */
export default function NewEventScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const today = useToday();
  const create = useCreateEvent();
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState<'weekly' | 'once'>('weekly');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [date, setDate] = useState<DateKey | null>(null);
  const [startDate, setStartDate] = useState<DateKey | null>(null);
  const [endDate, setEndDate] = useState<DateKey | null>(null);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(10 * 60);
  const [picking, setPicking] = useState<Picking>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const toggleDay = (d: number) => setWeekdays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort()));

  function save() {
    setServerError(null);
    const problem = !title.trim()
      ? '일정 이름을 적어 주세요.'
      : repeat === 'weekly' && weekdays.length === 0
        ? '반복할 요일을 하나 이상 골라 주세요.'
        : repeat === 'once' && !date
          ? '날짜를 골라 주세요.'
          : end === start
            ? '끝나는 시각이 시작 시각과 같아요.'
            : null;
    setError(problem);
    if (problem) return;
    const weekly = repeat === 'weekly';
    create.mutate(
      {
        title: title.trim(),
        repeat,
        weekdays: weekly ? weekdays : [],
        date: weekly ? null : date,
        startTime: toText(start),
        endTime: toText(end),
        startDate: weekly ? startDate : null,
        endDate: weekly ? endDate : null,
      },
      {
        onSuccess: () => {
          toast('개인 일정을 추가했어요');
          router.back();
        },
        onError: (e) => setServerError(errorMessage(e)),
      },
    );
  }

  const pickerValue = picking === 'date' ? date : picking === 'startDate' ? startDate : picking === 'endDate' ? endDate : null;
  const setPicked = (d: DateKey | null) => {
    if (picking === 'date') setDate(d);
    if (picking === 'startDate') setStartDate(d);
    if (picking === 'endDate') setEndDate(d);
    setPicking(null);
  };

  return (
    <Screen
      header={<TopBar title="개인 일정 추가" onBack={() => router.back()} />}
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
          <Button label="저장" onPress={save} disabled={create.isPending} />
        </Footer>
      }
      overlay={
        picking ? (
          <DatePickerSheet
            title={picking === 'date' ? '날짜' : picking === 'startDate' ? '반복 시작일' : '반복 종료일'}
            value={pickerValue}
            today={today}
            onSelect={(d) => setPicked(d)}
            {...(picking === 'date' ? {} : { clearLabel: picking === 'startDate' ? '처음부터' : '계속 반복', onClear: () => setPicked(null) })}
            onClose={() => setPicking(null)}
          />
        ) : null
      }
    >
      <TextField label="일정 이름" placeholder="예: 운영체제 수업, 동아리 모임" value={title} onChangeText={setTitle} />
      <Segmented
        options={[
          { value: 'weekly', label: '매주 반복' },
          { value: 'once', label: '한 번' },
        ]}
        value={repeat}
        onChange={setRepeat}
      />
      {repeat === 'weekly' ? (
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
        </>
      ) : (
        <DateField label="날짜" value={date} emptyText="날짜를 골라 주세요" onPress={() => setPicking('date')} />
      )}
      <TimeStepper label="시작 시각" minutes={start} onChange={setStart} />
      <TimeStepper label="끝나는 시각" minutes={end} onChange={setEnd} nextDay={end < start} />
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

function TimeStepper({ label, minutes, onChange, nextDay = false }: { label: string; minutes: number; onChange: (m: number) => void; nextDay?: boolean }) {
  const { colors, radius } = useAppTheme();
  const button = (name: string, delta: number, text: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${name}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(minutes + delta)}
      style={[styles.step, { borderColor: colors.line, borderRadius: radius.control }]}
    >
      <AppText color={disabled ? colors.inkFaint : colors.ink}>{text}</AppText>
    </Pressable>
  );
  return (
    <View style={styles.timeRow}>
      <AppText variant="small" style={styles.flex}>
        {label}
      </AppText>
      {button('30분 이르게', -STEP, '−', minutes - STEP < 0)}
      <View accessible accessibilityLabel={`${label}, ${nextDay ? '다음 날 ' : ''}${toText(minutes)}`} style={styles.timeBox}>
        {nextDay ? (
          <AppText variant="caption" tone="soft">
            다음 날
          </AppText>
        ) : null}
        <AppText variant="monoBold" color={colors.thread} style={styles.time}>
          {toText(minutes)}
        </AppText>
      </View>
      {button('30분 늦게', STEP, '+', minutes + STEP > DAY - STEP)}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 18 },
  days: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  day: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  flex: { flex: 1 },
  step: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeBox: { alignItems: 'center' },
  time: { fontSize: 18, lineHeight: 24, minWidth: 64, textAlign: 'center' },
});
