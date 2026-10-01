import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { ColorPicker } from '@/components/ColorPicker';
import { DDay } from '@/components/DDay';
import { Gantt } from '@/components/Gantt';
import { IconArrowDep, IconChat, IconFile, IconImage, IconLink } from '@/components/icons';
import { LoadError, Loading } from '@/components/QueryStatus';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { dDayLabel } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { downloadAttachment } from '@/api/attachments';
import { errorMessage } from '@/api/errors';
import type { Attachment } from '@/api/types';
import { ApiError } from '@/api/client';
import { selectGanttRange } from '@/lib/schedule';
import { useProject, useUpdateProject } from '@/queries/projects';
import { useToday } from '@/queries/use-today';
import { useToggleTask } from '@/queries/use-toggle-task';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';

type Tab = 'tasks' | 'plan';

/**
 * 프로젝트 상세 (Figma 04-a 태스크 / 04-b 일정).
 * 등록된 작업은 완료 체크만 된다 — 일정 알고리즘이 정한 일정을 지키려고 수정·추가를 막았다(사용자 결정 B, 바뀔 수 있음).
 * 프로젝트 색은 바꿀 수 있다(사용자 결정 I — Figma에 없음).
 */
export default function ProjectDetailScreen() {
  const router = useRouter();
  const { colors, radius } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const today = useToday();
  const query = useProject(Number(id));
  const updateProject = useUpdateProject();
  const toggle = useToggleTask(() => query.data?.name ?? '');
  const [tab, setTab] = useState<Tab>('tasks');
  const [colorOpen, setColorOpen] = useState(false);
  const [openTask, setOpenTask] = useState<number | null>(null);
  const project = query.data;

  if (!project) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen header={<TopBar title="" onBack={() => router.back()} />} contentStyle={styles.pad}>
        {query.isPending ? <Loading /> : notFound ? <AppText>프로젝트를 찾을 수 없어요.</AppText> : <LoadError error={query.error} onRetry={() => query.refetch()} />}
      </Screen>
    );
  }

  /** 첨부: 파일은 내려받아 공유 창으로 열고, 링크는 브라우저로 연다(사용자 결정 2026-10-01) */
  async function openAttachment(a: Attachment) {
    try {
      if (a.kind === 'link' && a.url) await Linking.openURL(a.url);
      else await downloadAttachment(a);
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  const palette = projectPaletteFor(project.color);
  const tasks = project.tasks;
  const doneCount = tasks.filter((t) => t.done).length;
  const summary = { done: doneCount, total: tasks.length, percent: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0 };

  return (
    <Screen
      header={
        <>
          <TopBar title="" onBack={() => router.back()} right={<DDay label={project.deadline ? dDayLabel(project.deadline, today) : '상시'} />} />
          <View style={[styles.head, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
            <View style={styles.badgeRow}>
              <Badge project={project} small />
              <Pressable accessibilityRole="button" accessibilityLabel="프로젝트 색 바꾸기" onPress={() => setColorOpen(true)} style={styles.colorButton}>
                <View style={[styles.colorDot, { backgroundColor: palette.dot }]} />
                <AppText variant="caption" tone="soft">
                  색 변경
                </AppText>
              </Pressable>
            </View>
            <AppText variant="heading" style={styles.name}>
              {project.name}
            </AppText>
            {project.description ? (
              <AppText variant="bodyRegular" tone="soft">
                {project.description}
              </AppText>
            ) : null}
            <View style={styles.progressRow}>
              <View style={[styles.track, { backgroundColor: colors.line }]}>
                <View style={[styles.fill, { width: `${summary.percent}%`, backgroundColor: palette.dot }]} />
              </View>
              <AppText variant="monoBold" color={palette.text}>{`${summary.done}/${summary.total} · ${summary.percent}%`}</AppText>
            </View>
            <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.line }]}>
              {(['tasks', 'plan'] as const).map((t) => {
                const on = tab === t;
                return (
                  <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t === 'tasks' ? '태스크' : '일정'} onPress={() => setTab(t)} style={[styles.tab, { borderBottomColor: on ? colors.ink : 'transparent' }]}>
                    <AppText variant="label" style={styles.tabText} tone={on ? 'default' : 'soft'}>
                      {t === 'tasks' ? '태스크' : '일정'}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      }
      contentStyle={styles.pad}
      overlay={
        colorOpen ? (
          <BottomSheet visible onClose={() => setColorOpen(false)} label="프로젝트 색">
            <AppText variant="sheetTitle">프로젝트 색</AppText>
            <ColorPicker
              label="프로젝트 색 목록"
              value={project.color}
              onChange={(color) => {
                setColorOpen(false);
                updateProject.mutate({ id: project.id, changes: { color } }, { onError: (e) => toast(errorMessage(e)) });
              }}
            />
          </BottomSheet>
        ) : null
      }>
      {tab === 'tasks' ? (
        <>
          <View style={styles.list}>
            {tasks.map((t) => {
              const dep = tasks.find((x) => x.id === t.dependsOnId);
              const blocked = dep && !dep.done;
              return (
                <View key={t.id} style={[styles.taskRow, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
                  <Checkbox checked={t.done} onToggle={() => toggle(t)} label={`${t.title} 완료`} color={palette.dot} />
                  {/* 누르면 세부 설명(목표·범위·완료 기준)을 펼친다 — 작업 내용은 고칠 수 없다(사용자 결정 B) */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: openTask === t.id }}
                    accessibilityLabel={`${t.title}, ${t.estimatedHours ?? 0}시간${dep ? `, 선행 ${dep.title}${blocked ? ' 필요' : ''}` : ''}, 설명 ${openTask === t.id ? '접기' : '보기'}`}
                    onPress={() => setOpenTask((o) => (o === t.id ? null : t.id))}
                    style={styles.taskBody}>
                    <View style={styles.flex}>
                      <View style={styles.inline}>
                        <AppText style={[styles.flex, t.done && { color: colors.inkSoft, textDecorationLine: 'line-through' }]}>{t.title}</AppText>
                        <AppText variant="mono" tone="soft">
                          {formatHours(t.estimatedHours ?? 0)}
                        </AppText>
                      </View>
                      {dep ? (
                        <View style={[styles.inline, styles.depLine]}>
                          <IconArrowDep size={12} color={colors.inkSoft} />
                          <AppText variant="micro" tone="soft">{`선행: ${dep.title}${blocked ? ' 필요' : ''}`}</AppText>
                        </View>
                      ) : null}
                      {openTask === t.id ? (
                        <AppText variant="small" tone="soft" style={styles.description}>
                          {t.description || '설명이 없어요.'}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Button label="AI에게 재요청" variant="soft" onPress={() => router.push('/project/new')} icon={(c) => <IconChat size={16} color={c} />} />
          {project.attachments.length > 0 ? (
            <View style={styles.attachments}>
              <AppText variant="label">참고자료</AppText>
              {project.attachments.map((a) => (
                <AttachmentRow key={a.id} attachment={a} onPress={() => openAttachment(a)} />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Gantt tasks={tasks} range={selectGanttRange(today)} today={today} color={palette.dot} />
      )}
    </Screen>
  );
}

const KIND_ICON = { link: IconLink, file: IconFile, image: IconImage } as const;

function AttachmentRow({ attachment, onPress }: { attachment: Attachment; onPress: () => void }) {
  const { colors, radius } = useAppTheme();
  const Icon = KIND_ICON[attachment.kind];
  const action = attachment.kind === 'link' ? '열기' : '내려받기';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${attachment.name} ${action}`}
      onPress={onPress}
      style={({ pressed }) => [styles.attachRow, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.control }, pressed && { backgroundColor: colors.canvas }]}>
      <Icon size={16} color={colors.inkSoft} />
      <AppText variant="small" numberOfLines={1} style={styles.flex}>
        {attachment.name}
      </AppText>
      <AppText variant="caption" color={colors.thread}>
        {action}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  head: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1, gap: 6 },
  name: { marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: 12 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  tabs: { flexDirection: 'row', marginTop: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, minHeight: 48 },
  tabText: { fontSize: 14 },
  list: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, paddingLeft: 16, paddingVertical: 14 },
  taskBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 16, minHeight: 24 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  depLine: { marginTop: 6, gap: 4 },
  description: { marginTop: 8 },
  flex: { flex: 1 },
  attachments: { gap: 8, marginTop: 8 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, paddingHorizontal: 14, minHeight: 48 },
});
