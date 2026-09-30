import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { formatDateLabel } from '@/lib/date';
import { fieldErrors, hoursToText, taskEditSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';

/** 프로젝트별 태스크 수정·삭제 */
export default function TaskEditScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
  const { state, dispatch } = useMockStore();
  const task = state.tasks.find((t) => t.id === taskId);

  const [title, setTitle] = useState(task?.title ?? '');
  const [hours, setHours] = useState(hoursToText(task?.estimatedHours ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!task) {
    return (
      <Screen edges={['bottom']}>
        <AppText>작업을 찾을 수 없어요.</AppText>
      </Screen>
    );
  }

  const prerequisites = state.tasks.filter((t) => task.dependsOn.includes(t.id));

  function save() {
    const result = taskEditSchema.safeParse({ title, hours });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    dispatch({ type: 'updateTask', taskId: task!.id, changes: { title: result.data.title, estimatedHours: result.data.hours } });
    router.back();
  }

  function confirmDelete() {
    Alert.alert('작업 삭제', `'${task!.title}' 작업을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'deleteTask', taskId: task!.id });
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <TextField label="작업 이름" value={title} onChangeText={setTitle} error={errors.title} />
      <TextField label="예상 소요 시간 (시간)" value={hours} onChangeText={setHours} error={errors.hours} keyboardType="decimal-pad" placeholder="모르면 비워 두세요" />

      <Card>
        <AppText variant="label">예정일</AppText>
        <AppText>{task.scheduledDate ? formatDateLabel(task.scheduledDate) : '일정 미배정'}</AppText>
        <AppText variant="label">선행 작업</AppText>
        {prerequisites.length > 0 ? prerequisites.map((p) => <AppText key={p.id}>{p.title}</AppText>) : <AppText tone="secondary">없음</AppText>}
      </Card>

      <Button label="저장" onPress={save} />
      <Button label="작업 삭제" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
