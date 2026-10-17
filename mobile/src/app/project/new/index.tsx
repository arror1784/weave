import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addLink, deleteAttachment, uploadAttachment } from '@/api/attachments';
import { errorMessage } from '@/api/errors';
import type { Attachment } from '@/api/types';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ColorPicker } from '@/components/ColorPicker';
import { DateField, DatePickerSheet } from '@/components/DatePicker';
import { Footer } from '@/components/Footer';
import { IconFile, IconImage, IconLink, IconTrash, type IconProps } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { dDayLabel, type DateKey } from '@/lib/date';
import { fieldErrors, linkSchema, projectBasicSchema } from '@/lib/validation';
import { useProject } from '@/queries/projects';
import { useSchedule } from '@/queries/schedule';
import { useToday } from '@/queries/use-today';
import { useDraft } from '@/state/DraftProvider';
import { useAppTheme } from '@/theme';
import { projectColorOrder, type ProjectColorKey } from '@/theme/colors';

const KIND_ICON: Record<Attachment['kind'], (p: IconProps) => React.ReactNode> = { link: IconLink, file: IconFile, image: IconImage };

/**
 * 프로젝트 등록 1/3: 기본 정보 (Figma 02-b-i) + 프로젝트 색(사용자 결정 I — Figma에 없음).
 * 참고자료는 고르는 즉시 서버에 올리고(형식·10MB·사진 위치정보는 서버가 검사), 등록할 때 id로 연결한다.
 * AI에게 첨부 내용을 보내는 것은 아직이다(사용자 결정 F — 이번엔 앱·저장까지).
 */
export default function NewProjectScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radius } = useAppTheme();
  const { dispatch } = useDraft();
  const today = useToday();
  const usedColors = useSchedule().data?.projects.map((p) => p.color);
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState<DateKey | null>(null);
  const [description, setDescription] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [progress, setProgress] = useState('');
  const [picked, setPicked] = useState<ProjectColorKey | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // "AI에게 재요청"(사용자 결정 2026-10-02): 기존 프로젝트의 기본 정보·색·첨부를 채워 두고, 확정하면 그 프로젝트의 미완료 작업을 바꾼다
  const projectId = Number(useLocalSearchParams<{ projectId?: string }>().projectId);
  const existing = useProject(projectId).data;
  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) return;
    filled.current = true;
    setName(existing.name);
    setDeadline(existing.deadline);
    setDescription(existing.description);
    setDeliverable(existing.deliverable);
    setProgress(existing.progress);
    setPicked(existing.color);
    setAttachments(existing.attachments);
  }, [existing]);
  // 기본 색: 진행중 프로젝트가 아직 쓰지 않은 색 — 사용자가 고르면 그 색
  const used = usedColors ?? [];
  const color = picked ?? projectColorOrder.find((c) => !used.includes(c)) ?? projectColorOrder[used.length % projectColorOrder.length];

  function next() {
    const result = projectBasicSchema.safeParse({ name, description, deadline: deadline ?? '', deliverable, progress });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    const replan = existing ? { projectId: existing.id, completedTasks: existing.tasks.filter((t) => t.done).map((t) => t.title) } : {};
    dispatch({ type: 'start', ...result.data, color, attachments, ...replan });
    router.push('/project/new/chat');
  }

  /** 서버에 올린 뒤 목록에 추가 — 실패하면 서버가 알려 준 이유(형식·크기)를 보여준다 */
  async function upload(run: () => Promise<Attachment>) {
    try {
      const saved = await run();
      setAttachments((list) => [...list, saved]);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }).catch(() => null);
    if (!result || result.canceled) return;
    const [asset] = result.assets;
    await upload(() => uploadAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }));
  }

  async function pickImage() {
    // 시스템 사진 선택기라 권한이 필요 없다. HEIC는 호환 형식(JPEG)으로 받는다 — 서버가 JPEG의 위치정보(EXIF)를 지운다(§3-9).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      exif: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    }).catch(() => null);
    if (!result || result.canceled) return;
    const [asset] = result.assets;
    await upload(() => uploadAttachment({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType }));
  }

  async function remove(a: Attachment) {
    try {
      await deleteAttachment(a.id);
      setAttachments((list) => list.filter((x) => x.id !== a.id));
    } catch (e) {
      toast(errorMessage(e), 'error');
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
            onAdd={async (url) => {
              setLinkOpen(false);
              await upload(() => addLink(url));
            }}
          />
        ) : dateOpen ? (
          <DatePickerSheet
            title="마감일"
            value={deadline}
            today={today}
            onSelect={(d) => {
              setDeadline(d);
              setDateOpen(false);
            }}
            clearLabel="마감 없음 (상시)"
            onClear={() => {
              setDeadline(null);
              setDateOpen(false);
            }}
            onClose={() => setDateOpen(false)}
          />
        ) : null
      }
      contentStyle={styles.content}>
      <TextField label="프로젝트명" placeholder="예: 임베디드시스템 과제" value={name} onChangeText={setName} error={errors.name} />
      {/* 마감일은 달력에서 고른다(사용자 결정 2026-10-01 — Figma는 날짜 입력칸). 비우면 마감 없음(상시) */}
      <DateField
        label="마감일"
        value={deadline}
        emptyText="선택 안 함 (상시)"
        onPress={() => setDateOpen(true)}
        accessory={
          deadline ? (
            <View style={[styles.dday, { backgroundColor: colors.threadSoft }]}>
              <AppText variant="monoBold" color={colors.thread}>
                {dDayLabel(deadline, today)}
              </AppText>
            </View>
          ) : null
        }
      />
      <TextField label="설명 · 목표" placeholder="무엇을, 누구와, 어디까지 하는지 적어 주세요" value={description} onChangeText={setDescription} multiline />
      {/* AI 프롬프트의 시작 데이터 — 비워 두면 챗봇이 묻는다 (사용자 결정 2026-10-01, Figma에 없음) */}
      <TextField label="결과물 형태" placeholder="예: 보고서, 발표자료, 앱" value={deliverable} onChangeText={setDeliverable} />
      <TextField label="기 진행사항" placeholder="이미 해 둔 작업이 있다면 적어 주세요" value={progress} onChangeText={setProgress} multiline />
      <View style={styles.group}>
        <AppText variant="fieldLabel" tone="soft">
          색
        </AppText>
        <ColorPicker
          label="프로젝트 색"
          value={color}
          onChange={setPicked}
        />
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
                  <Pressable accessibilityRole="button" accessibilityLabel={`${a.name} 첨부 삭제`} onPress={() => remove(a)} style={styles.remove}>
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
