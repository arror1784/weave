import { useState } from 'react';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { fieldErrors, signupSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';

export default function SignupScreen() {
  const { dispatch } = useMockStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const result = signupSchema.safeParse({ email, password, passwordConfirm });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    // ⚠ 목업: 가입 즉시 로그인 처리. API 연동 시 교체.
    dispatch({ type: 'signIn', email: result.data.email });
  }

  return (
    <Screen scroll edges={['bottom']}>
      <TextField label="이메일" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <TextField label="비밀번호" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <TextField label="비밀번호 확인" value={passwordConfirm} onChangeText={setPasswordConfirm} error={errors.passwordConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Button label="가입하기" onPress={submit} />
    </Screen>
  );
}
