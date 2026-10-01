import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconArrowDep, IconChevron, IconPlus, IconSparkle, IconTrash } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { sendChat, type ChatTurn } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { formatHours, withParticle } from '@/lib/korean';
import { useCreateProject, useReplaceProjectTasks } from '@/queries/projects';
import { formatShortDate } from '@/lib/date';
import { assistantTurn, canMoveTask, chatProject, newKey, toChatTasks } from '@/state/draft';
import { useDraft } from '@/state/DraftProvider';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * 프로젝트 등록 3/3: AI가 제안한 작업 검토 (Figma 02-b-iii) — 이름·시간 수정, 삭제, 선행 연결, 직접 추가, 세부 설명 보기.
 * 순서는 위·아래 버튼으로 바꾼다 — 선행 작업보다 앞으로는 못 간다(사용자 결정 2026-10-01, Figma에 없음). 서버는 이 순서대로 배치한다.
 * 직접 고친 목록을 "AI에게 다시 정리 요청"으로 보내 다시 제안받을 수 있다. "등록 완료"가 확정(사용자 결정 2026-10-01).
 * 작업을 고칠 수 있는 곳은 여기뿐이다 — 등록한 뒤에는 고칠 수 없다(사용자 결정 B).
 */
export default function ReviewScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius, typography } = useAppTheme();
  const { draft, dispatch } = useDraft();
  const create = useCreateProject();
  const replace = useReplaceProjectTasks(draft?.projectId);
  const [open, setOpen] = useState<string[]>([]);
  const [revising, setRevising] = useState(false);

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
    const d = draft!;
    // 서버가 임시 일정 알고리즘으로 작업 날짜를 배정한다(backend Scheduler)
    // 작업 마감일은 서버가 역산한다 — AI가 준 마감일(aiDueDate)은 참고용이라 보내지 않는다(사용자 결정)
    const tasks = d.tasks.map(({ key, title, description, estimatedHours, dependsOnKey, prerequisite }) => ({ key, title, description, estimatedHours, dependsOnKey, prerequisite }));
    const body = { name: d.name, description: d.description, deadline: d.deadline, color: d.color, deliverable: d.deliverable, progress: d.progress, tasks, attachmentIds: d.attachments.map((a) => a.id) };
    // 재요청이면 새로 만들지 않고 기존 프로젝트의 미완료 작업을 바꾼다(사용자 결정 2026-10-02)
    const replanning = d.projectId !== undefined;
    const save = replanning ? replace : create;
    save.mutate(
      body,
      {
        onSuccess: ({ project, lateCount }) => {
          const done = replanning ? `${d.name}의 작업을 다시 나눴어요` : `${withParticle(d.name, '이', '가')} 등록됐어요`;
          toast(`${done}${lateCount ? ` · 마감 안에 끝내기 빠듯한 작업 ${lateCount}개` : ''}`);
          router.dismissAll();
          router.navigate(`/projects/${project.id}`, { withAnchor: true });
          dispatch({ type: 'reset' });
        },
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );
  }

  /** 직접 고친 목록을 지금까지의 대화와 함께 AI에게 보내 다시 정리받는다 */
  async function revise() {
    const d = draft!;
    const history: ChatTurn[] = [...d.chat, { role: 'user', text: '', tasks: toChatTasks(d.tasks) }];
    setRevising(true);
    try {
      const r = await sendChat(chatProject(d), history, d.attachments.map((a) => a.id));
      dispatch({ type: 'setChat', chat: [...history, assistantTurn(r)] });
      if (r.type === 'tasks' && r.tasks) dispatch({ type: 'setTasks', tasks: r.tasks });
      toast(r.message);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setRevising(false);
    }
  }

  return (
    <Screen
      header={<StepHeader step={3} title="작업 검토" onBack={() => router.back()} />}
      footer={
        <Footer>
          <Button label="등록 완료" onPress={confirm} disabled={create.isPending || replace.isPending} />
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
                  // 긴 이름도 전부 보이게 줄바꿈한다(사용자 결정 2026-10-01). 엔터는 줄을 바꾸지 않고 입력을 마친다
                  multiline
                  submitBehavior="blurAndSubmit"
                  onChangeText={(title) => dispatch({ type: 'updateTask', key: t.key, changes: { title: title.replace(/\n/g, ' ') } })}
                  style={[typography.body, styles.nameInput, { color: colors.ink }]}
                />
                {([-1, 1] as const).map((offset) => {
                  const can = canMoveTask(tasks, t.key, offset);
                  return (
                    <Pressable
                      key={offset}
                      accessibilityRole="button"
                      accessibilityLabel={`${n}번 작업 ${offset < 0 ? '위로' : '아래로'}`}
                      accessibilityState={{ disabled: !can }}
                      disabled={!can}
                      onPress={() => dispatch({ type: 'moveTask', key: t.key, offset })}
                      hitSlop={{ top: 6, bottom: 6 }}
                      style={styles.iconButton}>
                      <View style={{ transform: [{ rotate: offset < 0 ? '-90deg' : '90deg' }] }}>
                        <IconChevron size={16} color={can ? colors.inkSoft : colors.inkFaint} />
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 삭제`} onPress={() => dispatch({ type: 'deleteTask', key: t.key })} hitSlop={12} style={styles.iconButton}>
                  <IconTrash size={17} color={colors.inkSoft} />
                </Pressable>
              </View>
              <View style={[styles.row, styles.meta]}>
                <View style={[styles.stepper, { borderColor: colors.line }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 시간 줄이기`} onPress={() => dispatch({ type: 'updateTask', key: t.key, changes: { estimatedHours: Math.max(0.5, t.estimatedHours - 0.5) } })} style={styles.stepButton}>
                    <AppText tone="soft">−</AppText>
                  </Pressable>
                  <AppText variant="monoBold" style={styles.stepValue} accessibilityLabel={`${n}번 작업 ${t.estimatedHours}시간`}>
                    {formatHours(t.estimatedHours)}
                  </AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${n}번 작업 시간 늘리기`} onPress={() => dispatch({ type: 'updateTask', key: t.key, changes: { estimatedHours: t.estimatedHours + 0.5 } })} style={styles.stepButton}>
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
                    onPress={() => dispatch({ type: 'updateTask', key: t.key, changes: { dependsOnKey: dep ? null : prev.key } })}
                    style={[styles.depButton, dep ? { backgroundColor: colors.threadSoft } : { borderColor: colors.control, borderWidth: 1, borderStyle: 'dashed' }]}>
                    <IconArrowDep size={13} color={dep ? colors.thread : colors.inkSoft} />
                    <AppText variant="micro" color={dep ? colors.thread : colors.inkSoft} numberOfLines={1} style={styles.depText}>
                      {dep ? `${depName} 완료 후` : '선행 연결'}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${n}번 작업 설명 ${open.includes(t.key) ? '접기' : '보기'}`}
                onPress={() => setOpen((o) => (o.includes(t.key) ? o.filter((k) => k !== t.key) : [...o, t.key]))}
                style={styles.more}>
                <AppText variant="caption" color={colors.thread}>
                  {open.includes(t.key) ? '설명 접기' : '설명 보기'}
                </AppText>
              </Pressable>
              {open.includes(t.key) ? (
                <View style={styles.detail}>
                  <AppText variant="small" tone="soft">
                    {t.description || '설명이 없어요.'}
                  </AppText>
                  {t.aiDueDate ? (
                    <AppText variant="caption" tone="soft">
                      {`AI 제안 마감 ${formatShortDate(t.aiDueDate)} (참고)`}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Button label="작업 직접 추가" variant="dashed" onPress={() => dispatch({ type: 'addTask', key: newKey('k') })} icon={(c) => <IconPlus size={16} color={c} />} />
      <Button label="AI에게 다시 정리 요청" variant="soft" onPress={revise} disabled={revising || tasks.length === 0} icon={(c) => <IconSparkle size={16} color={c} />} />
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
  more: { alignSelf: 'flex-start', paddingLeft: 26, minHeight: 32, justifyContent: 'center' },
  detail: { paddingLeft: 26, gap: 4 },
});
