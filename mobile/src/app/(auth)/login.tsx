import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { fieldErrors, loginSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { dispatch } = useMockStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    // ⚠ 목업: 서버 인증 없이 로그인 처리. API 연동 시 교체.
    dispatch({ type: 'signIn', email: result.data.email });
  }

  return (
    <Screen scroll style={{ justifyContent: 'center', flexGrow: 1 }}>
      <AppText variant="title">Weave</AppText>
      <AppText tone="secondary">여러 프로젝트를 하나의 일정으로</AppText>
      <TextField label="이메일" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <TextField label="비밀번호" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry autoComplete="password" textContentType="password" />
      <Button label="로그인" onPress={submit} />
      <Button label="회원가입" variant="secondary" onPress={() => router.push('/signup')} />
    </Screen>
  );
}
