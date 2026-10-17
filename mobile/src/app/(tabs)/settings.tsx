import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconCal, IconChevron, IconUser, IconWidget } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SettingsGroup, SettingsRow } from '@/components/SettingsGroup';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { useMe, useUpdateSettings } from '@/queries/me';
import type { SettingsChange } from '@/api/auth';
import { useReplan } from '@/queries/schedule';
import { useAppTheme } from '@/theme';

/**
 * 설정 (Figma 05). 알림 설정은 넣지 않았다 — 알림(S9) 사용 여부가 미정이라서.
 * 프로필은 이메일만 있다(가입 때 이름을 받지 않음).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const toast = useToast();
  const auth = useAuth();
  const me = useMe();
  const update = useUpdateSettings();
  const replan = useReplan();
  const email = me.data?.email ?? auth.user?.email ?? '';
  const user = me.data ?? auth.user;
  const weekly = user?.weeklyAvailableHours ?? Array<number>(7).fill(3);
  const holiday = user?.holidayAvailableHours ?? 3;
  // 상시 칸 시간 상한 — 가장 긴 요일(공휴일 포함, 사용자 결정 2026-10-17)
  const longest = Math.max(...weekly, holiday);
  const perWeek = user?.standingSessionsPerWeek ?? 2;
  const sessionHours = user?.standingSessionHours ?? 1;

  function save(changes: SettingsChange, onSettled: () => void) {
    update.mutate(changes, { onError: (e) => toast(errorMessage(e), 'error'), onSettled });
  }

  /** 작업이 몰렸을 때 사용자가 원하면 다시 배치(사용자 결정 2026-10-01) — 밀린 작업도 포함, 지연 표시는 남는다 */
  function confirmReplan() {
    Alert.alert('작업 다시 배치', '진행중 프로젝트의 남은 작업을 오늘부터 다시 배치해요. 밀린 작업도 비는 날로 옮겨요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '다시 배치',
        onPress: () => replan.mutate(undefined, { onSuccess: () => toast('작업을 다시 배치했어요'), onError: (e) => toast(errorMessage(e), 'error') }),
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert('계정 삭제', '계정과 모든 프로젝트·일정이 삭제돼요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      // 서버가 개인정보(계정·프로젝트·첨부 파일)를 실제로 지운다(루트 CLAUDE.md §3-17)
      { text: '삭제', style: 'destructive', onPress: () => auth.deleteAccount().catch((e) => toast(errorMessage(e), 'error')) },
    ]);
  }

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">설정</AppText>

      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.threadSoft }]}>
          <AppText variant="sheetTitle" color={colors.thread} accessibilityRole="text">
            {email.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="label">내 계정</AppText>
          <AppText variant="caption" tone="soft">
            {email}
          </AppText>
        </View>
      </Card>

      {/* 요일별·공휴일 가용 시간(사용자 결정 2026-10-17) — 월~일 + 공휴일 8줄, −/+ 0.5시간, 누를 때마다 저장하고 서버가 바로 다시 배치한다 */}
      <SettingsGroup title="요일별 가용 시간">
        <View style={styles.week}>
          {WEEKDAYS.map((label, i) => (
            <HoursRow
              key={label}
              label={label}
              hours={weekly[i]}
              disabled={update.isPending}
              onChange={(v) => save({ weeklyAvailableHours: weekly.map((h, j) => (j === i ? v : h)) }, () => {})}
            />
          ))}
          <HoursRow label="공휴일" hours={holiday} disabled={update.isPending} onChange={(v) => save({ holidayAvailableHours: v }, () => {})} />
          <AppText variant="caption" tone="soft" style={styles.weekCaption}>
            그날 이만큼까지 작업을 넣고, 넘으면 과부하로 알려드려요. 0시간인 날은 쉬는 날이에요. 바꾸면 일정을 바로 다시 배치해요.
          </AppText>
        </View>
      </SettingsGroup>

      {/* 상시(마감 없는) 프로젝트는 떼어 둔 칸에만 배치한다 — 사용자 결정 2026-10-17. 범위: 주 0~7번, 0.5~가장 긴 요일의 가용 시간 */}
      <SettingsGroup title="상시 프로젝트 시간">
        <SliderSetting
          label="상시 프로젝트 주 횟수"
          title="일주일에"
          min={0}
          max={7}
          step={1}
          value={perWeek}
          format={(v) => (v === 0 ? '안 함' : `주 ${v}번`)}
          onSave={(v, done) => save({ standingSessionsPerWeek: v }, done)}
        />
        <SliderSetting
          label="상시 프로젝트 한 번 시간"
          title="한 번에"
          min={0.5}
          max={Math.max(longest, 0.5)}
          step={0.5}
          value={Math.min(sessionHours, Math.max(longest, 0.5))}
          format={(v) => `${v}시간`}
          onSave={(v, done) => save({ standingSessionHours: v }, done)}
          caption={
            perWeek === 0
              ? '마감 없는 프로젝트의 작업은 배치하지 않아요'
              : '마감 없는 프로젝트의 작업은 한 주에서 가장 한가한 날에 이 시간만큼만 넣어요. 바꾸면 일정을 바로 다시 배치해요'
          }
        />
      </SettingsGroup>

      <SettingsGroup title="기타">
        <SettingsRow icon={(c) => <IconCal size={18} color={c} />} label="작업 다시 배치" onPress={confirmReplan} />
        <SettingsRow divider icon={(c) => <IconWidget size={18} color={c} />} label="홈 화면 위젯" onPress={() => router.push('/widgets')} right={<IconChevron size={16} color={colors.inkSoft} />} />
        <SettingsRow icon={(c) => <IconUser size={18} color={c} />} label="로그아웃" onPress={() => auth.signOut()} divider />
      </SettingsGroup>

      <Pressable accessibilityRole="button" accessibilityLabel="계정 삭제" onPress={confirmDelete} style={styles.delete}>
        <AppText variant="small" color={colors.dangerText}>
          계정 삭제
        </AppText>
      </Pressable>
    </Screen>
  );
}

const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
const MAX_HOURS = 24;

/** 요일 하나의 가용 시간 — −/+ 0.5시간(0~24), 0이면 "쉼" */
function HoursRow({ label, hours, disabled, onChange }: { label: string; hours: number; disabled: boolean; onChange: (v: number) => void }) {
  const { colors, radius } = useAppTheme();
  const name = `${label} 가용 시간`;
  const step = (delta: number) => onChange(Math.min(MAX_HOURS, Math.max(0, hours + delta)));
  return (
    <View style={styles.hoursRow} accessible={false} accessibilityLabel={name}>
      <AppText variant="small" style={styles.flex}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 줄이기`}
        accessibilityState={{ disabled: disabled || hours <= 0 }}
        disabled={disabled || hours <= 0}
        onPress={() => step(-0.5)}
        style={[styles.stepButton, { borderColor: colors.line, borderRadius: radius.control }]}
      >
        <AppText color={hours <= 0 ? colors.inkFaint : colors.ink}>−</AppText>
      </Pressable>
      <AppText variant="monoBold" color={hours === 0 ? colors.inkSoft : colors.thread} style={styles.hoursValue}>
        {hours === 0 ? '쉼' : `${hours}시간`}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 늘리기`}
        accessibilityState={{ disabled: disabled || hours >= MAX_HOURS }}
        disabled={disabled || hours >= MAX_HOURS}
        onPress={() => step(0.5)}
        style={[styles.stepButton, { borderColor: colors.line, borderRadius: radius.control }]}
      >
        <AppText color={colors.ink}>+</AppText>
      </Pressable>
    </View>
  );
}

/** 슬라이더 설정 한 줄 — 움직이는 동안은 화면에만 보여주고, 손을 떼면 서버에 저장한다 */
function SliderSetting({
  label,
  title = label,
  min,
  max,
  step,
  value,
  format,
  onSave,
  caption,
}: {
  label: string;
  title?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onSave: (v: number, done: () => void) => void;
  caption?: string;
}) {
  const { colors } = useAppTheme();
  const [dragging, setDragging] = useState<number | null>(null);
  const snap = (v: number) => Math.round(v / step) * step;
  const shown = dragging ?? value;
  return (
    <View style={styles.hours}>
      <View style={styles.between}>
        <AppText variant="small">{title}</AppText>
        <AppText variant="monoBold" color={colors.thread} style={styles.hoursValue}>
          {format(shown)}
        </AppText>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={shown}
        onValueChange={(v: number) => setDragging(snap(v))}
        onSlidingComplete={(v: number) => onSave(snap(v), () => setDragging(null))}
        minimumTrackTintColor={colors.thread}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.thread}
        style={styles.slider}
      />
      {caption ? (
        <AppText variant="caption" tone="soft">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  hours: { padding: 16, gap: 4 },
  week: { paddingHorizontal: 16, paddingVertical: 8 },
  weekCaption: { marginTop: 8 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  stepButton: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hoursValue: { fontSize: 18, lineHeight: 24 },
  slider: { height: 40, marginHorizontal: -8 },
  delete: { alignItems: 'center', paddingVertical: 14, minHeight: 48 },
});
