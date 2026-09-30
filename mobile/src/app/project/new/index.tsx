import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ColorPicker } from '@/components/ColorPicker';
import { Footer } from '@/components/Footer';
import { IconFile, IconImage, IconLink, IconTrash, type IconProps } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { dDayLabel } from '@/lib/date';
import { fieldErrors, isValidDateKey, linkSchema, projectBasicSchema } from '@/lib/validation';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { createId, suggestProjectColor } from '@/mocks/store';
import type { Attachment } from '@/mocks/types';
import { useAppTheme } from '@/theme';
import type { ProjectColorKey } from '@/theme/colors';

const KIND_ICON: Record<Attachment['kind'], (p: IconProps) => React.ReactNode> = { link: IconLink, file: IconFile, image: IconImage };

/**
 * 프로젝트 등록 1/3: 기본 정보 (Figma 02-b-i) + 프로젝트 색(사용자 결정 I — Figma에 없음).
 * 참고자료는 앱에서 고르고 목록으로 보여주는 데까지만 구현했다 — AI로 보내는 것은 백엔드 연동 때(사용자 결정 F).
 */
export default function NewProjectScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const { state, dispatch, today } = useMockStore();
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<ProjectColorKey>(() => suggestProjectColor(state));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function next() {
    const result = projectBasicSchema.safeParse({ name, description, deadline });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    dispatch({ type: 'startDraft', ...result.data, color, attachments });
    router.push('/project/new/chat');
  }

  const add = (a: Omit<Attachment, 'id'>) => setAttachments((list) => [...list, { id: createId('at'), ...a }]);

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;
      const [asset] = result.assets;
      add({ kind: 'file', name: asset.name, uri: asset.uri });
    } catch {
      toast('파일을 불러오지 못했어요');
    }
  }

  async function pickImage() {
    try {
      // 시스템 사진 선택기를 쓰므로 권한이 필요 없다. 위치 등 EXIF는 받지 않는다(§3-9).
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], exif: false });
      if (result.canceled) return;
      const [asset] = result.assets;
      add({ kind: 'image', name: asset.fileName ?? '사진', uri: asset.uri });
    } catch {
      toast('사진을 불러오지 못했어요');
    }
  }

  const buttons: { label: string; Icon: (p: IconProps) => React.ReactNode; onPress: () => void }[] = [
    { label: 'URL', Icon: IconLink, onPress: () => setLinkOpen(true) },
    { label: '파일', Icon: IconFile, onPress: pickFile },
    { label: '캡처', Icon: IconImage, onPress: pickImage },
  ];

  return (
    <Screen
      background="surface"
      header={<StepHeader step={1} title="기본 정보" onBack={() => router.back()} />}
      footer={
        <Footer>
          <Button label="다음" onPress={next} />
        </Footer>
      }
      overlay={
        linkOpen ? (
          <LinkSheet
            onClose={() => setLinkOpen(false)}
            onAdd={(url) => {
              add({ kind: 'link', name: url, uri: url });
              setLinkOpen(false);
            }}
          />
        ) : null
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
          색
        </AppText>
        <ColorPicker label="프로젝트 색" value={color} onChange={setColor} />
      </View>
      <View style={styles.group}>
        <AppText variant="fieldLabel" tone="soft">
          참고자료
        </AppText>
        <View style={styles.attach}>
          {buttons.map(({ label, Icon, onPress }) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label} 첨부`} onPress={onPress} style={[styles.attachButton, { borderColor: colors.control, borderRadius: radius.control }]}>
              <Icon size={18} color={colors.inkSoft} />
              <AppText variant="caption" tone="soft">
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
        {attachments.length > 0 ? (
          <View style={styles.list}>
            {attachments.map((a) => {
              const Icon = KIND_ICON[a.kind];
              return (
                <View key={a.id} style={[styles.item, { backgroundColor: colors.canvas, borderRadius: radius.control }]}>
                  <Icon size={16} color={colors.inkSoft} />
                  <AppText variant="small" numberOfLines={1} style={styles.flex}>
                    {a.name}
                  </AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${a.name} 첨부 삭제`} onPress={() => setAttachments((list) => list.filter((x) => x.id !== a.id))} style={styles.remove}>
                    <IconTrash size={16} color={colors.inkSoft} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function LinkSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();
  function submit() {
    const result = linkSchema.safeParse(url);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onAdd(result.data);
  }
  return (
    <BottomSheet visible onClose={onClose} label="링크 첨부">
      <AppText variant="sheetTitle">링크 첨부</AppText>
      <TextField label="링크 주소" placeholder="https://" value={url} onChangeText={setUrl} error={error} keyboardType="url" autoCapitalize="none" autoCorrect={false} />
      <Button label="추가" onPress={submit} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  dday: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  group: { gap: 6 },
  attach: { flexDirection: 'row', gap: 8 },
  attachButton: { flex: 1, alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14, minHeight: 48 },
  list: { gap: 6, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12 },
  flex: { flex: 1 },
  remove: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
