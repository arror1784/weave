import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

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

/**
 * 설정 → 상시 프로젝트 시간. 상시(마감 없는) 프로젝트는 떼어 둔 칸에만 배치한다(사용자 결정 2026-10-17).
 * 범위: 주 1~7번(0번은 막음, 2026-10-18) · 한 번에 0.5시간~가장 긴 요일(공휴일 포함)의 가용 시간.
 * 요일별 가용 시간처럼 별도 화면 + '저장' 버튼(2026-10-22).
 */
export default function StandingScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useAppTheme();
  const auth = useAuth();
  const me = useMe();
  const update = useUpdateSettings();
  const user = me.data ?? auth.user;
  const weekly = user?.weeklyAvailableHours ?? Array<number>(7).fill(3);
  const maxHours = Math.max(...weekly, user?.holidayAvailableHours ?? 3, 0.5);
  const savedPerWeek = user?.standingSessionsPerWeek ?? 2;
  const savedHours = Math.min(user?.standingSessionHours ?? 1, maxHours);
  const [perWeek, setPerWeek] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownPerWeek = perWeek ?? savedPerWeek;
  const shownHours = hours ?? savedHours;

  const changes: SettingsChange = {};
  if (shownPerWeek !== savedPerWeek) changes.standingSessionsPerWeek = shownPerWeek;
  if (shownHours !== savedHours) changes.standingSessionHours = shownHours;
  const changed = Object.keys(changes).length > 0;

  function save() {
    setError(null);
    update.mutate(changes, {
      onSuccess: () => {
        toast('상시 프로젝트 시간을 저장하고 일정을 다시 배치했어요');
        router.back();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  }

  return (
    <Screen
      header={<TopBar title="상시 프로젝트 시간" onBack={() => router.back()} />}
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
        마감 없는 프로젝트의 작업은 한 주에서 가장 한가한 날에 이 시간만큼만 넣어요. 저장하면 일정을 다시 배치해요.
      </AppText>
      <Card style={styles.card}>
        <SliderField label="상시 프로젝트 주 횟수" title="일주일에" min={1} max={7} step={1} value={shownPerWeek} format={(v) => `주 ${v}번`} onChange={setPerWeek} />
        <SliderField
          label="상시 프로젝트 한 번 시간"
          title="한 번에"
          min={0.5}
          max={maxHours}
          step={0.5}
          value={shownHours}
          format={(v) => `${v}시간`}
          onChange={setHours}
        />
        <AppText variant="caption" tone="soft">
          한 번 시간은 가장 긴 요일의 가용 시간({maxHours}시간)까지예요.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12 },
  card: { paddingHorizontal: 16, paddingVertical: 10 },
  error: { marginBottom: 10 },
});
