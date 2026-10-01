import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconLock, IconMail } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { ApiError } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { fieldErrors, PASSWORD_HINT, signupSchema } from '@/lib/validation';
import { useAppTheme } from '@/theme';

/** 회원가입 — Figma에 없는 화면이라 로그인과 같은 스타일로 만들었다. */
export default function SignupScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors } = useAppTheme();
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const result = signupSchema.safeParse({ email, password, passwordConfirm });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    setServerError(undefined);
    setSubmitting(true);
    try {
      // 가입하면 바로 로그인된다 — 이메일 인증은 이번엔 없음(사용자 결정)
      await auth.signUp(result.data.email, result.data.password);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_TAKEN') setErrors({ email: e.message });
      else if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setServerError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen background="surface" edges={['top', 'bottom']} header={<TopBar title="회원가입" onBack={() => router.back()} />} contentStyle={styles.content}>
      <View style={styles.fields}>
        <TextField label="이메일" placeholder="you@example.com" value={email} onChangeText={setEmail} error={errors.email} leading={(c) => <IconMail size={18} color={c} />} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <TextField label="비밀번호" value={password} onChangeText={setPassword} error={errors.password} hint={PASSWORD_HINT} leading={(c) => <IconLock size={18} color={c} />} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <TextField label="비밀번호 확인" value={passwordConfirm} onChangeText={setPasswordConfirm} error={errors.passwordConfirm} leading={(c) => <IconLock size={18} color={c} />} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      </View>
      {serverError ? (
        <AppText variant="small" color={colors.dangerText} accessibilityLiveRegion="polite">
          {serverError}
        </AppText>
      ) : null}
      <Button label="가입하기" onPress={submit} disabled={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 24 },
  fields: { gap: 12 },
});
