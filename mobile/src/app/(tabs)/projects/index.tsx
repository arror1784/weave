import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DDay } from '@/components/DDay';
import { Screen } from '@/components/Screen';
import { dDayLabel } from '@/lib/date';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { selectProjectSummary, selectProjects } from '@/mocks/store';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Filter = 'active' | 'done';

/** 프로젝트 목록 (Figma 04): 진행중/완료 필터, 마감 가까운 순 카드 */
export default function ProjectsScreen() {
  const router = useRouter();
  const { colors, radius } = useAppTheme();
  const { state, today } = useMockStore();
  const [filter, setFilter] = useState<Filter>('active');
  const list = selectProjects(state, filter);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="mono" tone="soft">{`프로젝트 ${state.projects.length}개`}</AppText>
        <AppText variant="title">프로젝트</AppText>
      </View>

      <View style={styles.filters}>
        {(['active', 'done'] as const).map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={f === 'active' ? '진행중' : '완료'}
              onPress={() => setFilter(f)}
              style={[styles.chip, on ? { backgroundColor: colors.ink } : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 }]}>
              <AppText variant="small" color={on ? colors.onThread : colors.inkSoft} style={styles.bold}>
                {f === 'active' ? '진행중' : '완료'}
              </AppText>
            </Pressable>
          );
        })}
        <AppText variant="caption" tone="soft" style={styles.sort}>
          마감임박순
        </AppText>
      </View>

      {list.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.control, borderRadius: radius.card }]}>
          <AppText variant="small" tone="soft" style={styles.center}>
            {'아직 완료한 프로젝트가 없어요.\n하나씩 엮어가는 중!'}
          </AppText>
        </View>
      ) : null}

      <View style={styles.list}>
        {list.map((p) => {
          const palette = projectPaletteFor(p.color);
          const s = selectProjectSummary(state, p.id, today);
          const dday = p.deadline ? dDayLabel(p.deadline, today) : '상시';
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${dday}, ${s.note}, ${s.done}/${s.total} 완료 · ${s.percent}%`}
              onPress={() => router.push(`/projects/${p.id}`)}
              style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }, pressed && styles.pressed]}>
              <View style={[styles.topBar, { backgroundColor: palette.dot }]} />
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <AppText variant="cardTitle" style={styles.flex}>
                    {p.name}
                  </AppText>
                  <DDay label={dday} />
                </View>
                <AppText variant="caption" color={s.late ? colors.dangerText : colors.inkSoft}>
                  {s.note}
                </AppText>
                <View style={[styles.row, styles.progressRow]}>
                  <View style={styles.segments}>
                    {Array.from({ length: s.total }, (_, k) => (
                      <View key={k} style={[styles.segment, { backgroundColor: k < s.done ? palette.dot : colors.line }]} />
                    ))}
                  </View>
                  <AppText variant="monoBold" color={palette.text}>{`${s.done}/${s.total} · ${s.percent}%`}</AppText>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 12 },
  header: { gap: 4 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  bold: { fontFamily: fonts.bold },
  sort: { marginLeft: 'auto' },
  empty: { borderWidth: 1, borderStyle: 'dashed', paddingVertical: 48 },
  center: { textAlign: 'center' },
  list: { gap: 10 },
  card: { borderWidth: 1, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.99 }] },
  topBar: { height: 4 },
  cardBody: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  progressRow: { marginTop: 8 },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
});
