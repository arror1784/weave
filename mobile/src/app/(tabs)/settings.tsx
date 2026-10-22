import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconCal, IconChevron, IconClock, IconUser, IconWidget } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SettingsGroup, SettingsRow } from '@/components/SettingsGroup';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { useMe } from '@/queries/me';
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
  const replan = useReplan();
  const email = me.data?.email ?? auth.user?.email ?? '';

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

      {/* 요일별 가용 시간·상시 프로젝트 시간은 각자 화면에서 슬라이더로 고르고 저장 버튼으로 한 번에 저장한다(사용자 결정 2026-10-22) — 예전엔 여기서 누를 때마다 저장·다시 배치해서 느렸다 */}
      <SettingsGroup title="작업 시간">
        <SettingsRow icon={(c) => <IconClock size={18} color={c} />} label="요일별 가용 시간" onPress={() => router.push('/availability')} right={<IconChevron size={16} color={colors.inkSoft} />} />
        <SettingsRow divider icon={(c) => <IconCal size={18} color={c} />} label="상시 프로젝트 시간" onPress={() => router.push('/standing')} right={<IconChevron size={16} color={colors.inkSoft} />} />
      </SettingsGroup>

      <SettingsGroup title="기타">
        {/* 개인 일정(수업·모임) — 그날 가용 시간에서 뺀다(사용자 결정 2026-10-17) */}
        <SettingsRow icon={(c) => <IconClock size={18} color={c} />} label="개인 일정" onPress={() => router.push('/events')} right={<IconChevron size={16} color={colors.inkSoft} />} />
        <SettingsRow divider icon={(c) => <IconCal size={18} color={c} />} label="작업 다시 배치" onPress={confirmReplan} />
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
  delete: { alignItems: 'center', paddingVertical: 14, minHeight: 48 },
});
