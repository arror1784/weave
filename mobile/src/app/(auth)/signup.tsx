import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconLock, IconMail } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { fieldErrors, signupSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';

/** 회원가입 — Figma에 없는 화면이라 로그인과 같은 스타일로 만들었다. */
export default function SignupScreen() {
  const router = useRouter();
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
    <Screen background="surface" edges={['top', 'bottom']} header={<TopBar title="회원가입" onBack={() => router.back()} />} contentStyle={styles.content}>
      <View style={styles.fields}>
        <TextField label="이메일" placeholder="you@example.com" value={email} onChangeText={setEmail} error={errors.email} leading={(c) => <IconMail size={18} color={c} />} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <TextField label="비밀번호" placeholder="8자 이상" value={password} onChangeText={setPassword} error={errors.password} leading={(c) => <IconLock size={18} color={c} />} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <TextField label="비밀번호 확인" value={passwordConfirm} onChangeText={setPasswordConfirm} error={errors.passwordConfirm} leading={(c) => <IconLock size={18} color={c} />} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      </View>
      <Button label="가입하기" onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 24 },
  fields: { gap: 12 },
});
