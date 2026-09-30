import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconFile, IconImage, IconLink, type IconProps } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { dDayLabel } from '@/lib/date';
import { fieldErrors, isValidDateKey, projectBasicSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

const ATTACH: { label: string; Icon: (p: IconProps) => React.ReactNode }[] = [
  { label: 'URL', Icon: IconLink },
  { label: '파일', Icon: IconFile },
  { label: '캡처', Icon: IconImage },
];

/** 프로젝트 등록 1/3: 기본 정보 (Figma 02-b-i) */
export default function NewProjectScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const { dispatch, today } = useMockStore();
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function next() {
    const result = projectBasicSchema.safeParse({ name, description, deadline });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    dispatch({ type: 'startDraft', ...result.data });
    router.push('/project/new/chat');
  }

  return (
    <Screen
      background="surface"
      header={<StepHeader step={1} title="기본 정보" onBack={() => router.back()} />}
      footer={
        <Footer>
          <Button label="다음" onPress={next} />
        </Footer>
      }
      contentStyle={styles.content}>
      <TextField label="프로젝트명" placeholder="예: 임베디드시스템 과제" value={name} onChangeText={setName} error={errors.name} />
      <TextField
        label="마감일"
        placeholder="2026-10-09"
        value={deadline}
        onChangeText={setDeadline}
        error={errors.deadline}
        keyboardType="numbers-and-punctuation"
        mono
        accessory={
          isValidDateKey(deadline) ? (
            <View style={[styles.dday, { backgroundColor: colors.threadSoft }]}>
              <AppText variant="monoBold" color={colors.thread}>
                {dDayLabel(deadline, today)}
              </AppText>
            </View>
          ) : null
        }
      />
      <TextField label="설명 · 목표" placeholder="무엇을, 누구와, 어디까지 하는지 적어 주세요" value={description} onChangeText={setDescription} multiline />
      <View style={styles.group}>
        <AppText variant="fieldLabel" tone="soft">
          참고자료
        </AppText>
        <View style={styles.attach}>
          {ATTACH.map(({ label, Icon }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={`${label} 첨부`}
              // ⚠ 목업: 첨부(링크·파일·사진 선택)는 아직 구현 전
              onPress={() => toast('첨부는 아직 준비 중이에요')}
              style={[styles.attachButton, { borderColor: colors.control, borderRadius: radius.control }]}>
              <Icon size={18} color={colors.inkSoft} />
              <AppText variant="caption" tone="soft">
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  dday: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  group: { gap: 6 },
  attach: { flexDirection: 'row', gap: 8 },
  attachButton: { flex: 1, alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14, minHeight: 48 },
});
