import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { IconCheck, IconSend, IconSparkle } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { StepHeader } from '@/components/StepHeader';
import { MOCK_CHAT_DONE, MOCK_CHAT_SCRIPT, MOCK_CHAT_TOTAL_QUESTIONS, MOCK_PROPOSED_TASKS } from '@/mocks/seed';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

/**
 * 프로젝트 등록 2/3: AI와 작업 쪼개기 (Figma 02-b-ii).
 * ⚠ 목업: 실제 AI를 부르지 않고 Figma의 대화를 차례로 보여준다. 백엔드 Claude API 연동 시 교체.
 */
export default function ChatScreen() {
  const router = useRouter();
  const { colors, typography, radius } = useAppTheme();
  const { dispatch } = useMockStore();
  const [shown, setShown] = useState(1);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const finished = answers.length > 0;
  const typing = shown < MOCK_CHAT_SCRIPT.length;
  const answeredInScript = MOCK_CHAT_SCRIPT.slice(0, shown).filter((m) => m.from === 'me').length;
  const progress = finished ? MOCK_CHAT_TOTAL_QUESTIONS : Math.min(MOCK_CHAT_TOTAL_QUESTIONS, 2 + answeredInScript);

  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setShown((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [shown, typing]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setAnswers((a) => [...a, text]);
    setDraft('');
    dispatch({ type: 'setDraftTasks', tasks: MOCK_PROPOSED_TASKS });
  }

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
            <AppText variant="monoBold" color={colors.thread} style={styles.right} accessibilityLabel={`질문 ${MOCK_CHAT_TOTAL_QUESTIONS}개 중 ${progress}번째`}>
              {`${progress}/${MOCK_CHAT_TOTAL_QUESTIONS}`}
            </AppText>
          </View>
        </>
      }
      footer={
        <Footer>
          {finished ? (
            <Button label="작업 검토하기" onPress={() => router.push('/project/new/review')} icon={(c) => <IconCheck size={17} color={c} />} />
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="답변 입력"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                returnKeyType="send"
                placeholder={typing ? '답변을 입력하세요' : '예: 하루 2시간 정도요'}
                placeholderTextColor={colors.inkSoft}
                style={[typography.body, styles.input, { borderColor: colors.control, color: colors.ink, backgroundColor: colors.surface }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="보내기"
                accessibilityState={{ disabled: !draft.trim() }}
                disabled={!draft.trim()}
                onPress={send}
                style={[styles.send, { backgroundColor: draft.trim() ? colors.thread : colors.line }]}>
                <IconSend size={18} color={draft.trim() ? colors.onThread : colors.inkSoft} />
              </Pressable>
            </View>
          )}
        </Footer>
      }>
      <ScrollView ref={scroll} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {MOCK_CHAT_SCRIPT.slice(0, shown).map((m, i) => (m.from === 'bot' ? <BotBubble key={i} text={m.text} /> : <UserBubble key={i} text={m.text} />))}
        {answers.map((a, i) => (
          <UserBubble key={`a${i}`} text={a} />
        ))}
        {finished ? <BotBubble text={MOCK_CHAT_DONE} /> : null}
        {!finished && typing ? (
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
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
