import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { fieldErrors, projectBasicSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';

/** 프로젝트 등록 1단계: 기본 정보 */
export default function NewProjectScreen() {
  const router = useRouter();
  const { dispatch } = useMockStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function next() {
    const result = projectBasicSchema.safeParse({ name, description });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    dispatch({ type: 'startDraft', name: result.data.name, description: result.data.description });
    router.push('/project/new/chat');
  }

  return (
    <Screen scroll edges={['bottom']}>
      <AppText tone="secondary">1 / 3 · 기본 정보</AppText>
      <TextField label="프로젝트 이름" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="내용 (주제·제출 안내·공지 등)" value={description} onChangeText={setDescription} multiline />
      <Button label="다음" onPress={next} />
    </Screen>
  );
}
