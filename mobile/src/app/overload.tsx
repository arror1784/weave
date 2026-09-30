import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Footer } from '@/components/Footer';
import { IconWarn } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TimeBar } from '@/components/TimeBar';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { formatHours } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectWeekLoad } from '@/mocks/store';
import { useAppTheme } from '@/theme';

/** 이번 주 과부하 (Figma 04-c): 예상 소요 vs 가용 시간, 미룰 작업 고르기 → 다음 주로 */
export default function OverloadScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const { state, dispatch, today } = useMockStore();
  const { estimated, available, candidates } = selectWeekLoad(state, today);
  const [deferred, setDeferred] = useState<string[]>([]);
  const saved = candidates.filter((t) => deferred.includes(t.id)).reduce((a, t) => a + (t.estimatedHours ?? 0), 0);
  const projected = estimated - saved;
  const over = estimated > available;

  function apply() {
    dispatch({ type: 'deferTasks', taskIds: deferred });
    toast(`${saved}시간을 다음 주로 옮겼어요`);
    router.back();
  }

  return (
    <Screen
      header={<TopBar title="이번 주" onBack={() => router.back()} />}
      footer={
        <Footer>
          <Button label="일정에 반영하기" onPress={apply} disabled={saved === 0} />
        </Footer>
      }
      contentStyle={styles.content}>
      <View style={styles.heading}>
        <View style={[styles.warnIcon, { backgroundColor: over ? colors.warnSoft : colors.threadSoft, borderRadius: radius.card }]}>
          <IconWarn size={22} color={over ? colors.warn : colors.thread} />
        </View>
        <View>
          <AppText variant="sheetTitle" color={over ? colors.warnText : colors.ink} style={styles.title}>
            {over ? '이번 주 과부하' : '이번 주는 여유가 있어요'}
          </AppText>
          <AppText variant="bodyRegular" tone="soft">
            {over ? '시간이 물리적으로 부족해요.' : '가용 시간 안에서 진행하고 있어요.'}
          </AppText>
        </View>
      </View>

      <Card style={styles.card}>
        <TimeBar label="예상 소요" hours={projected} max={Math.max(estimated, available)} color={projected > available ? colors.warn : colors.thread} textColor={projected > available ? colors.warnText : colors.thread} muted={estimated} />
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <TimeBar label="가용 시간" hours={available} max={Math.max(estimated, available)} color={colors.inkSoft} textColor={colors.inkSoft} />
        {saved > 0 ? (
          <AppText variant="caption" color={colors.thread} style={styles.center}>
            {`${saved}시간 미루면 예상 ${projected}시간 → 가용 안으로 ${projected <= available ? '들어와요 ✓' : '가까워져요'}`}
          </AppText>
        ) : over ? (
          <AppText variant="caption" color={colors.warnText} style={styles.center}>
            {`${Number((estimated - available).toFixed(2))}시간이 초과됐어요.`}
          </AppText>
        ) : null}
      </Card>

      <View>
        <AppText variant="label">뭘 미루시겠어요?</AppText>
        <AppText variant="caption" tone="soft" style={styles.sub}>
          미룰 작업을 골라 이번 주 부담을 줄여보세요.
        </AppText>
        <View style={styles.list}>
          {candidates.map((t) => {
            const off = deferred.includes(t.id);
            const project = state.projects.find((p) => p.id === t.projectId)!;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: off }}
                accessibilityLabel={`${t.title}, ${formatHours(t.estimatedHours ?? 0)}, ${off ? '다음 주로 미룸' : '미루기'}`}
                onPress={() => setDeferred((d) => (off ? d.filter((x) => x !== t.id) : [...d, t.id]))}
                style={[styles.item, { borderRadius: radius.card, borderColor: off ? colors.thread : colors.line, backgroundColor: off ? colors.threadSoft : colors.surface }]}>
                <View style={styles.flex}>
                  <Badge project={project} small />
                  <AppText variant="small" style={[styles.itemTitle, off && { color: colors.inkSoft, textDecorationLine: 'line-through' }]}>
                    {t.title}
                  </AppText>
                </View>
                <AppText variant="mono" tone="soft">
                  {formatHours(t.estimatedHours ?? 0)}
                </AppText>
                <View style={[styles.tag, { backgroundColor: off ? colors.thread : colors.canvas }]}>
                  <AppText variant="micro" color={off ? colors.onThread : colors.inkSoft}>
                    {off ? '다음 주로' : '미루기'}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20 },
  card: { padding: 16 },
  divider: { height: 1, marginVertical: 12 },
  center: { textAlign: 'center', marginTop: 12 },
  sub: { marginTop: 2, marginBottom: 12 },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  flex: { flex: 1, gap: 6 },
  itemTitle: { fontSize: 14 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});
