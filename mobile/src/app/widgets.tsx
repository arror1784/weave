import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DDay } from '@/components/DDay';
import { IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { dDayLabel, formatDateLabel } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectDayLoad, selectTodayTasks, taskTone } from '@/mocks/store';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';
import { fonts } from '@/theme/typography';

/** 홈 화면 위젯 미리보기 (Figma 06): 소형 2×2 · 중형 4×2 */
export default function WidgetsScreen() {
  const router = useRouter();
  const { colors, typography } = useAppTheme();
  const { state, today } = useMockStore();
  const pending = selectTodayTasks(state, today).filter((t) => !t.done);
  const urgent = pending[0];
  const load = selectDayLoad(state, today, { includeOverdue: true });
  /** '9월 30일 수' */
  const shortDate = formatDateLabel(today).replace(/요일$/, '');
  const projectOf = (id: string) => state.projects.find((p) => p.id === id)!;

  return (
    <Screen header={<TopBar title="홈 화면 위젯" onBack={() => router.back()} />} contentStyle={{ ...styles.content, backgroundColor: colors.wallpaper }}>
      <AppText variant="fieldLabel" tone="soft">
        소형 2×2
      </AppText>
      <View style={styles.smallRow}>
        <View
          accessible
          accessibilityLabel={`오늘 ${pending.length}개 남음${urgent ? `, 가장 급한 일 ${urgent.title}, ${urgent.dueDate ? dDayLabel(urgent.dueDate, today) : ''}` : ''}`}
          style={[styles.small, { backgroundColor: colors.surface }]}>
          <View style={styles.inline}>
            <View style={[styles.dot, { backgroundColor: colors.thread }]} />
            <AppText variant="micro" tone="soft">
              오늘
            </AppText>
          </View>
          <AppText variant="hero" style={styles.bigNumber}>
            {pending.length}
            <Text style={[typography.label, { color: colors.inkSoft }]}>개 남음</Text>
          </AppText>
          {urgent ? (
            <View style={[styles.urgent, { backgroundColor: colors.canvas }]}>
              <AppText variant="micro" tone="soft">
                가장 급한 일
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                {urgent.title}
              </AppText>
              {urgent.dueDate ? <DDay label={dDayLabel(urgent.dueDate, today)} tone={taskTone(urgent, today)} /> : null}
            </View>
          ) : null}
        </View>
        <AppText variant="caption" tone="soft" style={styles.flex}>
          {'앱을 열지 않고도\n오늘 남은 일과\n가장 급한 일 하나.'}
        </AppText>
      </View>

      <AppText variant="fieldLabel" tone="soft">
        중형 4×2
      </AppText>
      <View style={[styles.medium, { backgroundColor: colors.surface }]}>
        <View style={[styles.inline, styles.between]}>
          <AppText variant="label" style={{ fontFamily: fonts.black }}>
            {shortDate}
          </AppText>
          {load.over ? (
            <View style={[styles.overPill, { backgroundColor: colors.warnSoft }]}>
              <IconWarn size={11} color={colors.warn} />
              <AppText variant="micro" color={colors.warnText}>{`과부하 ${formatHours(load.hours)} / ${formatHours(load.capacity)}`}</AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.mediumList}>
          {pending.slice(0, 4).map((t) => {
            const palette = projectPaletteFor(projectOf(t.projectId).color);
            return (
              <View key={t.id} style={styles.inline}>
                <View style={[styles.circle, { borderColor: palette.dot }]} />
                <View style={[styles.stick, { backgroundColor: palette.dot }]} />
                <AppText variant="small" numberOfLines={1} style={styles.flex}>
                  {t.title}
                </AppText>
                {t.dueDate ? <DDay label={dDayLabel(t.dueDate, today)} tone={taskTone(t, today)} /> : null}
              </View>
            );
          })}
        </View>
      </View>
      <AppText variant="caption" tone="soft">
        홈 화면을 길게 누르고 위젯에서 Weave를 찾아 추가하세요.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24, gap: 8 },
  smallRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  small: { width: 155, height: 155, borderRadius: 26, padding: 16, elevation: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bigNumber: { fontSize: 40, lineHeight: 44, marginTop: 4 },
  urgent: { marginTop: 'auto', borderRadius: 12, padding: 8 },
  flex: { flex: 1 },
  medium: { borderRadius: 26, padding: 16, elevation: 4, marginBottom: 12 },
  overPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  mediumList: { gap: 8, marginTop: 10 },
  circle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  stick: { width: 2, height: 12, borderRadius: 1 },
});
