import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconLock, IconMail } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { WeaveMark } from '@/components/WeaveMark';
import { fieldErrors, loginSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/** 로그인 (Figma 01). 소셜 로그인은 쓰지 않는다 — 이메일 + 비밀번호만(루트 CLAUDE.md §1). */
export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
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
    <Screen background="surface" edges={['top', 'bottom']} contentStyle={styles.content}>
      <View>
        <WeaveMark size={56} />
        <AppText variant="hero" style={styles.title}>
          Weave
        </AppText>
        <AppText variant="bodyRegular" tone="soft" style={styles.tagline}>
          {'여러 프로젝트를\n하나의 오늘로 엮다.'}
        </AppText>
      </View>

      <View style={styles.fields}>
        <TextField label="이메일" placeholder="you@example.com" value={email} onChangeText={setEmail} error={errors.email} leading={(c) => <IconMail size={18} color={c} />} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <TextField label="비밀번호" placeholder="비밀번호" value={password} onChangeText={setPassword} error={errors.password} leading={(c) => <IconLock size={18} color={c} />} secureTextEntry autoComplete="password" textContentType="password" />
      </View>

      <Button label="로그인" onPress={submit} />

      <View style={styles.signup}>
        <AppText variant="small" tone="soft">
          처음이신가요?
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="회원가입" onPress={() => router.push('/signup')} hitSlop={12}>
          <AppText variant="small" color={colors.thread} style={styles.link}>
            회원가입
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 32, gap: 24 },
  title: { marginTop: 24 },
  tagline: { marginTop: 12, fontSize: 15, lineHeight: 24 },
  fields: { marginTop: 24, gap: 12 },
  signup: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { fontFamily: fonts.bold, textDecorationLine: 'underline' },
});
