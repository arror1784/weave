import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { sendChat, type ChatTurn } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconCheck, IconSend, IconSparkle } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { parseBold, stripBold } from '@/lib/markdown';
import { assistantTurn, chatProject } from '@/state/draft';
import { useDraft } from '@/state/DraftProvider';
import { useAppTheme } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * 프로젝트 등록 2/3: AI와 작업 쪼개기 (Figma 02-b-ii).
 * 서버가 Claude API를 부르고, 질문·작업 분할은 사용자 프롬프트(docs/Weave-AI 작업 분할 시스템 프롬프트.md)를 따른다.
 * 대화는 초안에 보관하고 매번 전체를 보낸다(첨부 id 포함). 작업을 제안받은 뒤에도 대화로 계속 고칠 수 있고,
 * 검토 화면의 "등록 완료"가 확정이다(사용자 결정 2026-10-01).
 */
export default function ChatScreen() {
  const router = useRouter();
  const { colors, typography, radius } = useAppTheme();
  const { draft, dispatch } = useDraft();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const scroll = useRef<ScrollView>(null);
  const project = draft ? chatProject(draft) : null;
  // 등록 1단계에서 올린 첨부 — 서버가 내용을 AI에게 함께 보낸다
  const attachmentIds = draft?.attachments.map((a) => a.id) ?? [];

  // 첫 질문: 대화가 비어 있으면 기본 정보만 보내 받는다(화면에 들어오면 한 번)
  const first = useQuery({
    queryKey: ['project-chat-first', project, attachmentIds],
    queryFn: () => sendChat(project!, [], attachmentIds, draft?.conversationId),
    enabled: !!draft && draft.chat.length === 0 && draft.tasks.length === 0,
    staleTime: Infinity,
    retry: false,
  });

  const chat: ChatTurn[] = draft?.chat.length ? draft.chat : first.data ? [assistantTurn(first.data)] : [];
  const proposed = (draft?.tasks.length ?? 0) > 0 || chat.some((m) => m.tasks?.length);
  const pending = sending || first.isFetching;
  // 기다리는 동안 무엇을 하는 중인지(사용자 결정 2026-10-01 — 화면 변화가 없어 멈춘 것처럼 보였다)
  const pendingText = first.isFetching && !draft?.chat.length
    ? '프로젝트 정보를 읽고 첫 질문을 준비하고 있어요…'
    : proposed
      ? '고친 내용을 반영해 작업을 다시 정리하고 있어요…'
      : '답변을 바탕으로 생각하고 있어요…';
  const error = sendError ?? (draft?.chat.length ? undefined : first.error ? errorMessage(first.error) : undefined);

  async function ask(history: ChatTurn[]) {
    if (!project) return;
    setSending(true);
    setSendError(undefined);
    try {
      const r = await sendChat(project, history, attachmentIds, draft?.conversationId);
      dispatch({ type: 'setChat', chat: [...history, assistantTurn(r)] });
      if (r.type === 'tasks' && r.tasks) dispatch({ type: 'setTasks', tasks: r.tasks });
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
    if (first.data?.tasks && !draft?.tasks.length) {
      dispatch({ type: 'setChat', chat });
      dispatch({ type: 'setTasks', tasks: first.data.tasks });
    }
    router.push('/project/new/review');
  }

  const canSend = !!input.trim() && !pending && !error;

  return (
    <Screen
      scroll={false}
      // Figma의 질문 진행 표시(n/5)는 뺐다 — 사용자 결정(2026-10-01)
      header={
        <>
          <StepHeader step={2} title="AI와 작업 쪼개기" onBack={() => router.back()} />
          {/* 지금 단계 안내(사용자 결정 2026-10-01) */}
          <View style={[styles.status, { backgroundColor: colors.threadSoft }]}>
            <AppText variant="caption" color={colors.thread} accessibilityLiveRegion="polite">
              {proposed ? '작업 목록을 받았어요. 고칠 점을 말하거나 검토로 넘어가세요.' : '질문에 답하면 AI가 작업 목록을 제안해요.'}
            </AppText>
          </View>
        </>
      }
      footer={
        <Footer>
          {/* 제안을 받은 뒤에도 의견을 보내 다시 제안받을 수 있다 — 검토 화면의 "등록 완료"가 확정 */}
          {proposed ? <Button label="작업 검토하기" onPress={review} icon={(c) => <IconCheck size={17} color={c} />} /> : null}
            <View style={[styles.inputRow, proposed && styles.inputGap]}>
              <TextInput
                accessibilityLabel="답변 입력"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={send}
                editable={!pending}
                returnKeyType="send"
                placeholder={proposed ? '고칠 점을 말해 주세요' : '답변을 입력하세요'}
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
        </Footer>
      }>
      <ScrollView ref={scroll} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {chat.map((m, i) =>
          m.role === 'assistant' ? (
            <View key={i} style={styles.turn}>
              <BotBubble text={m.text} />
              {m.tasks?.length ? <ProposalCard count={m.tasks.length} assumptions={m.assumptions ?? []} /> : null}
            </View>
          ) : (
            <UserBubble key={i} text={m.tasks?.length ? [`직접 고친 목록(${m.tasks.length}개)을 보냈어요.`, m.text].filter(Boolean).join('\n') : m.text} />
          ),
        )}
        {error ? (
          <View style={styles.errorRow}>
            <AppText variant="small" color={colors.dangerText} accessibilityLiveRegion="polite">
              {error}
            </AppText>
            <Button label="다시 시도" variant="soft" compact onPress={retry} />
          </View>
        ) : null}
        {pending ? (
          <View style={styles.botRow} accessible accessibilityLabel="AI가 답을 준비하는 중" accessibilityLiveRegion="polite">
            <View style={[styles.avatar, { backgroundColor: colors.threadSoft }]}>
              <IconSparkle size={15} color={colors.thread} />
            </View>
            <View style={[styles.bubble, styles.botBubble, styles.pendingBubble, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
              <ActivityIndicator size="small" color={colors.thread} />
              <AppText variant="small" tone="soft" style={styles.flex}>
                {pendingText}
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );

  function BotBubble({ text }: { text: string }) {
    return (
      <View style={styles.botRow} accessible accessibilityLabel={`도우미: ${stripBold(text)}`}>
        <View style={[styles.avatar, { backgroundColor: colors.threadSoft }]}>
          <IconSparkle size={15} color={colors.thread} />
        </View>
        <View style={[styles.bubble, styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.card }]}>
          <AppText variant="bodyRegular">
            {parseBold(text).map((p, i) => (p.bold ? <AppText key={i} variant="bodyRegular" style={styles.bold}>{p.text}</AppText> : p.text))}
          </AppText>
        </View>
      </View>
    );
  }

  /** 작업 제안 요약 — 개수와 AI가 가정한 것(일정이 빠듯한 작업 안내 포함). 목록 자체는 검토 화면에서 */
  function ProposalCard({ count, assumptions }: { count: number; assumptions: string[] }) {
    return (
      <View style={[styles.card, { backgroundColor: colors.threadSoft, borderRadius: radius.card }]}>
        <AppText variant="label" color={colors.thread}>{`제안한 작업 ${count}개`}</AppText>
        {assumptions.map((a, i) => (
          <AppText key={i} variant="small" tone="soft">{`· ${a}`}</AppText>
        ))}
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
  messages: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10 },
  botBubble: { borderWidth: 1, borderTopLeftRadius: 6 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: { borderTopRightRadius: 6 },
  bold: { fontFamily: fonts.bold },
  status: { paddingHorizontal: 20, paddingVertical: 8 },
  pendingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flexShrink: 1 },
  errorRow: { alignItems: 'flex-start', gap: 8, paddingLeft: 36 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputGap: { marginTop: 8 },
  turn: { gap: 8 },
  card: { marginLeft: 36, padding: 12, gap: 4 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
