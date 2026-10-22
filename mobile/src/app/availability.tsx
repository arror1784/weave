import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SettingsChange } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Footer } from '@/components/Footer';
import { Screen } from '@/components/Screen';
import { SliderField } from '@/components/SliderField';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { useMe, useUpdateSettings } from '@/queries/me';
import { useAppTheme } from '@/theme';

const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
const MAX_HOURS = 24;
const hoursLabel = (v: number) => (v === 0 ? '쉼' : `${v}시간`);

/**
 * 설정 → 요일별 가용 시간(요일별·공휴일은 사용자 결정 2026-10-17, 화면·슬라이더·저장 버튼은 2026-10-22).
 * 슬라이더는 화면 값만 바꾸고, '저장'을 누르면 바뀐 값만 한 번에 보낸다 — 서버는 저장할 때 일정을 다시 배치한다.
 */
export default function AvailabilityScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useAppTheme();
  const auth = useAuth();
  const me = useMe();
  const update = useUpdateSettings();
  const user = me.data ?? auth.user;
  const savedWeekly = user?.weeklyAvailableHours ?? Array<number>(7).fill(3);
  const savedHoliday = user?.holidayAvailableHours ?? 3;
  // 손대기 전엔 서버 값을 그대로 보여준다(서버 값이 늦게 와도 따라간다)
  const [weekly, setWeekly] = useState<number[] | null>(null);
  const [holiday, setHoliday] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownWeekly = weekly ?? savedWeekly;
  const shownHoliday = holiday ?? savedHoliday;

  const changes: SettingsChange = {};
  if (shownWeekly.some((h, i) => h !== savedWeekly[i])) changes.weeklyAvailableHours = shownWeekly;
  if (shownHoliday !== savedHoliday) changes.holidayAvailableHours = shownHoliday;
  const changed = Object.keys(changes).length > 0;

  function save() {
    setError(null);
    update.mutate(changes, {
      onSuccess: () => {
        toast('가용 시간을 저장하고 일정을 다시 배치했어요');
        router.back();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  }

  return (
    <Screen
      header={<TopBar title="요일별 가용 시간" onBack={() => router.back()} />}
      contentStyle={styles.content}
      footer={
        <Footer>
          {error ? (
            <AppText variant="small" color={colors.dangerText} accessibilityRole="alert" style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <Button label={update.isPending ? '저장하는 중…' : '저장'} onPress={save} disabled={!changed || update.isPending} />
        </Footer>
      }
    >
      <AppText variant="caption" tone="soft">
        그날 이만큼까지 작업을 넣고, 넘으면 과부하로 알려드려요. 0시간인 날은 쉬는 날이에요. 저장하면 일정을 다시 배치해요.
      </AppText>
      <Card style={styles.card}>
        {DAYS.map((day, i) => (
          <SliderField
            key={day}
            testID={`hours-${day}`}
            label={`${day} 가용 시간`}
            title={day}
            min={0}
            max={MAX_HOURS}
            step={0.5}
            value={shownWeekly[i]}
            format={hoursLabel}
            onChange={(v) => setWeekly(shownWeekly.map((h, j) => (j === i ? v : h)))}
          />
        ))}
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <SliderField testID="hours-공휴일" label="공휴일 가용 시간" title="공휴일" min={0} max={MAX_HOURS} step={0.5} value={shownHoliday} format={hoursLabel} onChange={setHoliday} />
        <AppText variant="caption" tone="soft">
          공휴일에는 요일 대신 이 시간을 써요.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12 },
  card: { paddingHorizontal: 16, paddingVertical: 10 },
  divider: { height: 1, marginVertical: 8 },
  error: { marginBottom: 10 },
});
