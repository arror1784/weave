import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Task } from '@/mocks/types';
import { useAppTheme } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconCheck, IconTrash } from './icons';
import { TextField } from './TextField';

const HOUR_OPTIONS = [1, 2, 3, 4, 6];

type Props = {
  task: Task;
  others: Task[];
  onClose: () => void;
  onSave: (changes: Pick<Task, 'title' | 'estimatedHours' | 'dependsOn'>) => void;
  onDelete: () => void;
};

/** 작업 수정 시트 (Figma EditSheet): 제목 · 예상 소요시간(1·2·3·4·6h) · 선행 작업(하나) · 삭제/저장 */
export function EditTaskSheet({ task, others, onClose, onSave, onDelete }: Props) {
  const { colors } = useAppTheme();
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState(task.estimatedHours);
  const [dependsOn, setDependsOn] = useState(task.dependsOn);
  const [error, setError] = useState<string>();

  function save() {
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    onSave({ title: title.trim(), estimatedHours: hours, dependsOn });
  }

  return (
    <BottomSheet visible onClose={onClose} label="작업 수정">
      <AppText variant="sheetTitle">작업 수정</AppText>
      <TextField label="제목" value={title} onChangeText={setTitle} error={error} />

      <View style={styles.group}>
        <AppText variant="fieldLabel" tone="soft">
          예상 소요시간
        </AppText>
        <View accessibilityRole="radiogroup" style={styles.hours}>
          {HOUR_OPTIONS.map((h) => (
            <Choice key={h} label={`${h}h`} a11yLabel={`${h}시간`} selected={hours === h} onPress={() => setHours(h)} mono stretch />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="fieldLabel" tone="soft">
          선행 작업
        </AppText>
        <View accessibilityRole="radiogroup" style={styles.deps}>
          {others.map((o) => (
            <Choice key={o.id} label={o.title} selected={dependsOn === o.id} onPress={() => setDependsOn(dependsOn === o.id ? null : o.id)} pill />
          ))}
          {others.length === 0 ? (
            <AppText variant="caption" tone="soft">
              다른 작업이 없어요.
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="삭제" variant="danger" compact onPress={onDelete} icon={(c) => <IconTrash size={16} color={c} />} />
        <View style={styles.flex}>
          <Button label="저장" onPress={save} />
        </View>
      </View>
    </BottomSheet>
  );

  function Choice({ label, a11yLabel, selected, onPress, mono, stretch, pill }: { label: string; a11yLabel?: string; selected: boolean; onPress: () => void; mono?: boolean; stretch?: boolean; pill?: boolean }) {
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={a11yLabel ?? label}
        onPress={onPress}
        style={[
          styles.choice,
          stretch && styles.flex,
          { borderRadius: pill ? 999 : 12, borderColor: selected ? colors.thread : colors.line, backgroundColor: selected ? colors.threadSoft : colors.surface },
        ]}>
        {selected && pill ? <IconCheck size={12} color={colors.thread} /> : null}
        <AppText variant={mono ? 'monoBold' : 'caption'} color={selected ? colors.thread : colors.inkSoft}>
          {label}
        </AppText>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  hours: { flexDirection: 'row', gap: 8 },
  deps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 12, minHeight: 44 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  flex: { flex: 1 },
});
