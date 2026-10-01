import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { sendChat, type ChatTurn } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import type { ChatResponse } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconCheck, IconSend, IconSparkle } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { useDraft } from '@/state/DraftProvider';
import { useAppTheme } from '@/theme';

/** 진행 표시의 전체 질문 수 — Figma 디자인(질문 n/5). 서버 응답이 오면 그 값을 쓴다 */
const DEFAULT_TOTAL = 5;

/**
 * 프로젝트 등록 2/3: AI와 작업 쪼개기 (Figma 02-b-ii).
 * 서버가 Claude API를 부른다(앱은 AI를 직접 부르지 않는다). 대화는 초안에 보관하고 매번 전체를 보낸다.
 * 질문 내용은 서버의 임시 프롬프트가 정한다(사용자가 작성 중).
 */
export default function ChatScreen() {
  const router = useRouter();
  const { colors, typography, radius } = useAppTheme();
  const { draft, dispatch } = useDraft();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [last, setLast] = useState<ChatResponse | null>(null);
  const scroll = useRef<ScrollView>(null);
  const project = draft ? { name: draft.name, description: draft.description, deadline: draft.deadline } : null;

  // 첫 질문: 대화가 비어 있으면 기본 정보만 보내 받는다(화면에 들어오면 한 번)
  const first = useQuery({
    queryKey: ['project-chat-first', project],
    queryFn: () => sendChat(project!, []),
    enabled: !!draft && draft.chat.length === 0 && draft.tasks.length === 0,
    staleTime: Infinity,
    retry: false,
  });

  const chat: ChatTurn[] = draft?.chat.length ? draft.chat : first.data ? [{ role: 'assistant', text: first.data.message }] : [];
  const reply = last ?? first.data ?? null;
  const finished = (draft?.tasks.length ?? 0) > 0 || reply?.type === 'tasks';
  const pending = sending || first.isFetching;
  const error = sendError ?? (draft?.chat.length ? undefined : first.error ? errorMessage(first.error) : undefined);
  const total = reply?.totalQuestions ?? DEFAULT_TOTAL;
  const shownProgress = finished ? total : (reply?.questionNumber ?? 0);

  function applyTasks(r: ChatResponse) {
    if (r.type === 'tasks' && r.tasks) dispatch({ type: 'setTasks', tasks: r.tasks });
  }

  async function ask(history: ChatTurn[]) {
    if (!project) return;
    setSending(true);
    setSendError(undefined);
    try {
      const r = await sendChat(project, history);
      dispatch({ type: 'setChat', chat: [...history, { role: 'assistant', text: r.message }] });
      applyTasks(r);
      setLast(r);
    } catch (e) {
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    const history: ChatTurn[] = [...chat, { role: 'user', text }];
    dispatch({ type: 'setChat', chat: history });
    setInput('');
    ask(history);
  }

  function retry() {
    if (!draft?.chat.length && !sendError) first.refetch();
    else ask(chat);
  }

  function review() {
    // 첫 응답에서 바로 작업을 제안했으면 초안에 담고 간다
    if (first.data && !draft?.tasks.length) applyTasks(first.data);
    router.push('/project/new/review');
  }

  const canSend = !!input.trim() && !pending && !error;

  return (
    <Screen
      scroll={false}
      header={
        <>
          <StepHeader step={2} title="AI와 작업 쪼개기" onBack={() => router.back()} />
          <View style={[styles.progress, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <IconSparkle size={14} color={colors.thread} />
            <AppText variant="caption" tone="soft">
              질문 진행
            </AppText>
            <AppText variant="monoBold" color={colors.thread} style={styles.right} accessibilityLabel={`질문 ${total}개 중 ${shownProgress}번째`}>
              {`${shownProgress}/${total}`}
            </AppText>
          </View>
        </>
      }
      footer={
        <Footer>
          {finished ? (
            <Button label="작업 검토하기" onPress={review} icon={(c) => <IconCheck size={17} color={c} />} />
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="답변 입력"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={send}
                returnKeyType="send"
                placeholder="답변을 입력하세요"
                placeholderTextColor={colors.inkSoft}
                style={[typography.body, styles.input, { borderColor: colors.control, color: colors.ink, backgroundColor: colors.surface }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="보내기"
                accessibilityState={{ disabled: !canSend }}
                disabled={!canSend}
                onPress={send}
                style={[styles.send, { backgroundColor: canSend ? colors.thread : colors.line }]}>
                <IconSend size={18} color={canSend ? colors.onThread : colors.inkSoft} />
              </Pressable>
            </View>
          )}
        </Footer>
      }>
      <ScrollView ref={scroll} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {chat.map((m, i) => (m.role === 'assistant' ? <BotBubble key={i} text={m.text} /> : <UserBubble key={i} text={m.text} />))}
        {error ? (
          <View style={styles.errorRow}>
            <AppText variant="small" color={colors.dangerText} accessibilityLiveRegion="polite">
              {error}
            </AppText>
            <Button label="다시 시도" variant="soft" compact onPress={retry} />
          </View>
        ) : null}
        {pending ? (
          <View style={styles.typing} accessibilityLabel="도우미가 입력 중">
            {[0, 1, 2].map((d) => (
              <View key={d} style={[styles.typingDot, { backgroundColor: colors.inkFaint }]} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );

  function BotBubble({ text }: { text: string }) {
    return (
      <View style={styles.botRow} accessible accessibilityLabel={`도우미: ${text}`}>
        <View style={[styles.avatar, { backgroundColor: colors.threadSoft }]}>
          <IconSparkle size={15} color={colors.thread} />
        </View>
        <View style={[styles.bubble, styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
          <AppText variant="bodyRegular">{text}</AppText>
        </View>
      </View>
    );
  }

  function UserBubble({ text }: { text: string }) {
    return (
      <View style={styles.userRow} accessible accessibilityLabel={`나: ${text}`}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.thread, borderRadius: radius.card }]}>
          <AppText variant="bodyRegular" color={colors.onThread}>
            {text}
          </AppText>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
  right: { marginLeft: 'auto' },
  messages: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10 },
  botBubble: { borderWidth: 1, borderTopLeftRadius: 6 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: { borderTopRightRadius: 6 },
  typing: { flexDirection: 'row', gap: 4, paddingLeft: 40 },
  errorRow: { alignItems: 'flex-start', gap: 8, paddingLeft: 36 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
