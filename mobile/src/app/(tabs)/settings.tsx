import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconChevron, IconUser, IconWidget } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SettingsGroup, SettingsRow } from '@/components/SettingsGroup';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

/**
 * 설정 (Figma 05). 알림 설정은 넣지 않았다 — 알림(S9) 사용 여부가 미정이라서.
 * 프로필은 이메일만 있다(가입 때 이름을 받지 않음).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { state, dispatch } = useMockStore();
  const email = state.session?.email ?? '';
  const hours = state.settings.dailyAvailableHours;

  function confirmDelete() {
    Alert.alert('계정 삭제', '계정과 모든 프로젝트·일정이 삭제돼요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      // ⚠ 목업: 서버 탈퇴 처리 없이 로그아웃만 한다. API 연동 시 서버에서 삭제·익명화(루트 CLAUDE.md §3-17).
      { text: '삭제', style: 'destructive', onPress: () => dispatch({ type: 'signOut' }) },
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
            onValueChange={(v: number) => dispatch({ type: 'setDailyHours', hours: Math.round(v * 2) / 2 })}
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
        <SettingsRow icon={(c) => <IconWidget size={18} color={c} />} label="홈 화면 위젯" onPress={() => router.push('/widgets')} right={<IconChevron size={16} color={colors.inkSoft} />} />
        <SettingsRow icon={(c) => <IconUser size={18} color={c} />} label="로그아웃" onPress={() => dispatch({ type: 'signOut' })} divider />
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
