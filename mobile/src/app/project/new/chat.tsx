import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MOCK_CHAT_QUESTIONS, MOCK_PROPOSED_TASKS } from '@/mocks/seed';
import { useMockStore } from '@/mocks/MockStoreProvider';
import { useAppTheme } from '@/theme';

type Message = { from: 'bot' | 'me'; text: string };

/**
 * 프로젝트 등록 2단계: 챗봇.
 * ⚠ 목업: 실제 AI를 부르지 않고 UI 초안의 질문을 순서대로 보여준다. 백엔드 Claude API 연동 시 교체.
 */
export default function ChatScreen() {
  const router = useRouter();
  const { dispatch } = useMockStore();
  const { colors, spacing } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: MOCK_CHAT_QUESTIONS[0] }]);
  const [input, setInput] = useState('');
  const answered = messages.filter((m) => m.from === 'me').length;
  const finished = answered >= MOCK_CHAT_QUESTIONS.length;

  function send() {
    const text = input.trim();
    if (!text) return;
    const nextQuestion = MOCK_CHAT_QUESTIONS[answered + 1];
    const reply: Message = nextQuestion ? { from: 'bot', text: nextQuestion } : { from: 'bot', text: '세부 작업 단계를 제안했어요. 검토해 주세요.' };
    setMessages((prev) => [...prev, { from: 'me', text }, reply]);
    setInput('');
    if (!nextQuestion) dispatch({ type: 'setDraftTasks', tasks: MOCK_PROPOSED_TASKS });
  }

  return (
    <Screen scroll edges={['bottom']}>
      <AppText tone="secondary">2 / 3 · 작업 단계 만들기 (목업 — AI 연동 전)</AppText>
      <View style={{ gap: spacing.sm }}>
        {messages.map((m, i) => (
          <View
            key={i}
            accessible
            accessibilityLabel={`${m.from === 'bot' ? '도우미' : '나'}: ${m.text}`}
            style={[
              styles.bubble,
              { padding: spacing.sm + 4 },
              m.from === 'bot' ? { alignSelf: 'flex-start', backgroundColor: colors.surface } : { alignSelf: 'flex-end', backgroundColor: colors.primary },
            ]}>
            <AppText style={m.from === 'me' ? { color: colors.onPrimary } : undefined}>{m.text}</AppText>
          </View>
        ))}
      </View>

      {finished ? (
        <Button label="작업 단계 검토하기" onPress={() => router.push('/project/new/review')} />
      ) : (
        <>
          <TextField label="답변 입력" value={input} onChangeText={setInput} onSubmitEditing={send} returnKeyType="send" />
          <Button label="보내기" onPress={send} disabled={input.trim() === ''} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: 16 },
});
