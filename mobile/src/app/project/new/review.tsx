import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { hoursSchema, hoursToText } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

/** 프로젝트 등록 3단계: 제안된 작업 태스크 검토(수정·삭제·추가) 후 등록 */
export default function ReviewScreen() {
  const router = useRouter();
  const { state, dispatch } = useMockStore();
  const { colors, spacing } = useAppTheme();
  const [hoursText, setHoursText] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const tasks = state.draft?.tasks ?? [];

  if (!state.draft) {
    return (
      <Screen edges={['bottom']}>
        <AppText>등록 중인 프로젝트가 없어요.</AppText>
      </Screen>
    );
  }

  function changeHours(index: number, text: string) {
    setHoursText((prev) => ({ ...prev, [index]: text }));
    const parsed = hoursSchema.safeParse(text);
    if (parsed.success) dispatch({ type: 'updateDraftTask', index, changes: { estimatedHours: parsed.data } });
  }

  function remove(index: number) {
    dispatch({ type: 'deleteDraftTask', index });
    setHoursText({});
  }

  function confirm() {
    if (tasks.some((t) => t.title.trim() === '')) {
      setError('이름이 비어 있는 작업이 있어요.');
      return;
    }
    dispatch({ type: 'confirmDraft' });
    router.dismissTo('/');
  }

  return (
    <Screen scroll edges={['bottom']}>
      <AppText tone="secondary">3 / 3 · 작업 단계 검토</AppText>
      <AppText variant="subtitle">{state.draft.name}</AppText>

      {tasks.map((task, index) => {
        const n = index + 1;
        return (
          <Card key={index}>
            <TextField label={`${n}번 작업 이름`} value={task.title} onChangeText={(title) => dispatch({ type: 'updateDraftTask', index, changes: { title } })} />
            <TextField label={`${n}번 예상 소요 시간 (시간)`} value={hoursText[index] ?? hoursToText(task.estimatedHours)} onChangeText={(t) => changeHours(index, t)} keyboardType="decimal-pad" placeholder="모르면 비워 두세요" />
            <Button label={`${n}번 작업 삭제`} variant="danger" onPress={() => remove(index)} />
          </Card>
        );
      })}

      <Button label="작업 추가" variant="secondary" onPress={() => dispatch({ type: 'addDraftTask' })} />
      {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
      <View style={{ marginTop: spacing.sm }}>
        <Button label="프로젝트 등록" onPress={confirm} />
      </View>
    </Screen>
  );
}
