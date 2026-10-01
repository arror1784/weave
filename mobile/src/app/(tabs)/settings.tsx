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
import { useMe, useUpdateDailyHours } from '@/queries/me';
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
  const updateHours = useUpdateDailyHours();
  const replan = useReplan();
  const email = me.data?.email ?? auth.user?.email ?? '';
  // 슬라이더를 움직이는 동안은 화면에만 보여주고, 손을 떼면 서버에 저장한다
  const [dragging, setDragging] = useState<number | null>(null);
  const hours = dragging ?? me.data?.dailyAvailableHours ?? auth.user?.dailyAvailableHours ?? 3;

  function saveHours(value: number) {
    const rounded = Math.round(value * 2) / 2;
    updateHours.mutate(rounded, { onError: (e) => toast(errorMessage(e)), onSettled: () => setDragging(null) });
  }

  /** 작업이 몰렸을 때 사용자가 원하면 다시 배치(사용자 결정 2026-10-01) — 밀린 작업도 포함, 지연 표시는 남는다 */
  function confirmReplan() {
    Alert.alert('작업 다시 배치', '진행중 프로젝트의 남은 작업을 오늘부터 다시 배치해요. 밀린 작업도 비는 날로 옮겨요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '다시 배치',
        onPress: () => replan.mutate(undefined, { onSuccess: () => toast('작업을 다시 배치했어요'), onError: (e) => toast(errorMessage(e)) }),
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert('계정 삭제', '계정과 모든 프로젝트·일정이 삭제돼요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      // 서버가 개인정보(계정·프로젝트·첨부 파일)를 실제로 지운다(루트 CLAUDE.md §3-17)
      { text: '삭제', style: 'destructive', onPress: () => auth.deleteAccount().catch((e) => toast(errorMessage(e))) },
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

      {/* 하루 가용 시간(기본 3시간) — 사용자 결정 E. Figma는 주간 가용 시간 */}
      <SettingsGroup title="일정 기준">
        <View style={styles.hours}>
          <View style={styles.between}>
            <AppText variant="small">하루 가용 시간</AppText>
            <AppText variant="monoBold" color={colors.thread} style={styles.hoursValue}>{`${hours}시간`}</AppText>
          </View>
          <Slider
            accessibilityLabel="하루 가용 시간"
            minimumValue={1}
            maximumValue={8}
            step={0.5}
            value={hours}
            onValueChange={(v: number) => setDragging(Math.round(v * 2) / 2)}
            onSlidingComplete={saveHours}
            minimumTrackTintColor={colors.thread}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.thread}
            style={styles.slider}
          />
          <AppText variant="caption" tone="soft">
            새 프로젝트의 작업을 하루에 이만큼까지 배정하고, 넘으면 과부하로 알려드려요
          </AppText>
        </View>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  hours: { padding: 16, gap: 4 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hoursValue: { fontSize: 18, lineHeight: 24 },
  slider: { height: 40, marginHorizontal: -8 },
  delete: { alignItems: 'center', paddingVertical: 14, minHeight: 48 },
});
