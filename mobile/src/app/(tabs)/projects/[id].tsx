import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { DDay } from '@/components/DDay';
import { EditTaskSheet } from '@/components/EditTaskSheet';
import { Gantt } from '@/components/Gantt';
import { IconArrowDep, IconChat, IconEdit, IconPlus } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { dDayLabel } from '@/lib/date';
import { formatHours } from '@/lib/korean';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { createId, selectGanttRange, selectProjectSummary } from '@/mocks/store';
import type { Task } from '@/mocks/types';
import { useAppTheme } from '@/theme';
import { projectPaletteFor } from '@/theme/colors';

type Tab = 'tasks' | 'plan';

/** 프로젝트 상세 (Figma 04-a 태스크 / 04-b 일정) */
export default function ProjectDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, today } = useMockStore();
  const [tab, setTab] = useState<Tab>('tasks');
  const [editingId, setEditingId] = useState<string | null>(null);
  const project = state.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <Screen header={<TopBar title="" onBack={() => router.back()} />} contentStyle={styles.pad}>
        <AppText>프로젝트를 찾을 수 없어요.</AppText>
      </Screen>
    );
  }

  const palette = projectPaletteFor(project.color);
  const tasks = state.tasks.filter((t) => t.projectId === project.id);
  const summary = selectProjectSummary(state, project.id, today);
  const editing = tasks.find((t) => t.id === editingId);

  function addTask() {
    const task: Task = { id: createId('t'), projectId: project!.id, title: '새 작업', estimatedHours: 1, dependsOn: null, scheduledDate: null, spanDays: 1, dueDate: null, done: false, prerequisite: false };
    dispatch({ type: 'addTask', task });
    setEditingId(task.id);
  }

  return (
    <Screen
      header={
        <>
          <TopBar title="" onBack={() => router.back()} right={<DDay label={project.deadline ? dDayLabel(project.deadline, today) : '상시'} />} />
          <View style={[styles.head, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
            <Badge project={project} small />
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
        editing ? (
          <EditTaskSheet
            key={editing.id}
            task={editing}
            others={tasks.filter((t) => t.id !== editing.id)}
            onClose={() => setEditingId(null)}
            onSave={(changes) => {
              dispatch({ type: 'updateTask', taskId: editing.id, changes });
              setEditingId(null);
              toast('작업을 수정했어요');
            }}
            onDelete={() => {
              dispatch({ type: 'deleteTask', taskId: editing.id });
              setEditingId(null);
              toast('작업을 삭제했어요');
            }}
          />
        ) : null
      }>
      {tab === 'tasks' ? (
        <>
          <View style={styles.list}>
            {tasks.map((t) => {
              const dep = tasks.find((x) => x.id === t.dependsOn);
              const blocked = dep && !dep.done;
              return (
                <View key={t.id} style={[styles.taskRow, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
                  <Checkbox checked={t.done} onToggle={() => dispatch({ type: 'toggleTask', taskId: t.id })} label={`${t.title} 완료`} color={palette.dot} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.title} 수정, ${t.estimatedHours ?? 0}시간${dep ? `, 선행 ${dep.title}${blocked ? ' 필요' : ''}` : ''}`}
                    onPress={() => setEditingId(t.id)}
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
                    </View>
                    <IconEdit size={15} color={colors.inkSoft} />
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="작업 추가" variant="dashed" onPress={addTask} icon={(c) => <IconPlus size={16} color={c} />} />
            </View>
            <View style={styles.flex}>
              <Button label="AI에게 재요청" variant="soft" onPress={() => router.push('/project/new')} icon={(c) => <IconChat size={16} color={c} />} />
            </View>
          </View>
        </>
      ) : (
        <Gantt tasks={tasks} range={selectGanttRange(today)} today={today} color={palette.dot} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  head: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1, gap: 6 },
  name: { marginTop: 4 },
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
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
});
