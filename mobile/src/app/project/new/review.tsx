import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconArrowDep, IconPlus, IconTrash } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { formatHours, withParticle } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { createId } from '@/mocks/store';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/** 프로젝트 등록 3/3: AI가 제안한 작업 검토 (Figma 02-b-iii) — 이름·시간 수정, 삭제, 선행 연결, 직접 추가 */
export default function ReviewScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius, typography } = useAppTheme();
  const { state, dispatch } = useMockStore();
  const draft = state.draft;

  if (!draft) {
    return (
      <Screen header={<StepHeader step={3} title="작업 검토" onBack={() => router.back()} />} contentStyle={styles.content}>
        <AppText>등록 중인 프로젝트가 없어요.</AppText>
      </Screen>
    );
  }

  const tasks = draft.tasks;
  const total = tasks.reduce((a, t) => a + t.estimatedHours, 0);

  function confirm() {
    const projectId = createId('p');
    const name = draft!.name;
    dispatch({ type: 'confirmDraft', projectId });
    toast(`${withParticle(name, '이', '가')} 등록됐어요`);
    router.dismissAll();
    router.navigate(`/projects/${projectId}`);
  }

  return (
    <Screen
      header={<StepHeader step={3} title="작업 검토" onBack={() => router.back()} />}
      footer={
        <Footer>
          <Button label="등록 완료" onPress={confirm} />
        </Footer>
      }
      contentStyle={styles.content}>
      <View style={styles.summary}>
        <AppText variant="bodyRegular" tone="soft">
          AI가 제안한 작업 <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{`${tasks.length}개`}</Text>
        </AppText>
        <AppText variant="mono" tone="soft">{`총 ${formatHours(total)}`}</AppText>
      </View>

      <View style={styles.list}>
        {tasks.map((t, i) => {
          const n = i + 1;
          const prev = tasks[i - 1];
          const dep = tasks.find((x) => x.key === t.dependsOnKey);
          const depName = (dep ?? prev)?.title.split(' (')[0];
          return (
            <View key={t.key} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
              <View style={styles.row}>
                <AppText variant="monoBold" tone="soft" style={styles.index}>
                  {String(n).padStart(2, '0')}
                </AppText>
                <TextInput
                  accessibilityLabel={`${n}번 작업 이름`}
                  value={t.title}
                  onChangeText={(title) => dispatch({ type: 'updateDraftTask', key: t.key, changes: { title } })}
                  style={[typography.body, styles.nameInput, { color: colors.ink }]}
                />
                <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 삭제`} onPress={() => dispatch({ type: 'deleteDraftTask', key: t.key })} hitSlop={12} style={styles.iconButton}>
                  <IconTrash size={17} color={colors.inkSoft} />
                </Pressable>
              </View>
              <View style={[styles.row, styles.meta]}>
                <View style={[styles.stepper, { borderColor: colors.line }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 시간 줄이기`} onPress={() => dispatch({ type: 'updateDraftTask', key: t.key, changes: { estimatedHours: Math.max(0.5, t.estimatedHours - 0.5) } })} style={styles.stepButton}>
                    <AppText tone="soft">−</AppText>
                  </Pressable>
                  <AppText variant="monoBold" style={styles.stepValue} accessibilityLabel={`${n}번 작업 ${t.estimatedHours}시간`}>
                    {formatHours(t.estimatedHours)}
                  </AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 시간 늘리기`} onPress={() => dispatch({ type: 'updateDraftTask', key: t.key, changes: { estimatedHours: t.estimatedHours + 0.5 } })} style={styles.stepButton}>
                    <AppText tone="soft">+</AppText>
                  </Pressable>
                </View>
                {t.prerequisite ? (
                  <View style={[styles.preTag, { backgroundColor: colors.threadSoft }]}>
                    <AppText variant="micro" color={colors.thread}>
                      선행 학습
                    </AppText>
                  </View>
                ) : null}
                {prev ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={dep ? `선행 연결 해제: ${depName} 완료 후` : `선행 연결: ${depName} 완료 후`}
                    onPress={() => dispatch({ type: 'updateDraftTask', key: t.key, changes: { dependsOnKey: dep ? null : prev.key } })}
                    style={[styles.depButton, dep ? { backgroundColor: colors.threadSoft } : { borderColor: colors.control, borderWidth: 1, borderStyle: 'dashed' }]}>
                    <IconArrowDep size={13} color={dep ? colors.thread : colors.inkSoft} />
                    <AppText variant="micro" color={dep ? colors.thread : colors.inkSoft} numberOfLines={1} style={styles.depText}>
                      {dep ? `${depName} 완료 후` : '선행 연결'}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Button label="작업 직접 추가" variant="dashed" onPress={() => dispatch({ type: 'addDraftTask', key: createId('k') })} icon={(c) => <IconPlus size={16} color={c} />} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { gap: 8 },
  card: { borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  index: { fontSize: 11, width: 18 },
  nameInput: { flex: 1, paddingVertical: 4, minHeight: 40 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  meta: { paddingLeft: 26 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  stepButton: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, textAlign: 'center' },
  preTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  depButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, maxWidth: '55%', minHeight: 36 },
  depText: { flexShrink: 1 },
});
