import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import type { PersonalEvent } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Footer } from '@/components/Footer';
import { IconPlus, IconTrash } from '@/components/icons';
import { LoadError, Loading } from '@/components/QueryStatus';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { formatDateLabel } from '@/lib/date';
import { useDeleteEvent, useEvents } from '@/queries/events';
import { useAppTheme } from '@/theme';

const WEEKDAY = ['월', '화', '수', '목', '금', '토', '일'];

/** 반복: '매주 월·수 · 10:00~12:00' (기간이 있으면 덧붙임) · 한 번: '10월 24일 토요일 · 18:00~21:00' · 자정을 넘기면 '22:00~다음 날 01:00' */
export function describeEvent(e: PersonalEvent): string {
  // 끝이 시작보다 이르면 자정을 넘겨 다음 날까지(사용자 결정 2026-10-18)
  const time = `${e.startTime}~${e.endTime <= e.startTime ? '다음 날 ' : ''}${e.endTime}`;
  if (e.repeat === 'once') return `${e.date ? formatDateLabel(e.date) : ''} · ${time}`;
  const period = e.startDate || e.endDate ? ` · ${e.startDate ?? '처음'}부터 ${e.endDate ?? '계속'}${e.endDate ? '까지' : ''}` : '';
  return `매주 ${e.weekdays.map((d) => WEEKDAY[d - 1]).join('·')} · ${time}${period}`;
}

/**
 * 설정 → 개인 일정(사용자 결정 2026-10-17) — 수업·모임처럼 작업을 못 하는 시간. 그날 가용 시간에서 이만큼 뺀다.
 * 수정은 없고 지운 뒤 다시 추가한다. 추가·삭제는 다음 등록이나 "작업 다시 배치" 때 일정에 반영된다.
 */
export default function EventsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useAppTheme();
  const events = useEvents();
  const remove = useDeleteEvent();

  function confirmDelete(e: PersonalEvent) {
    Alert.alert('개인 일정 삭제', `"${e.title}"을(를) 지울까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => remove.mutate(e.id, { onSuccess: () => toast('개인 일정을 지웠어요'), onError: (err) => toast(errorMessage(err), 'error') }),
      },
    ]);
  }

  const list = events.data?.items ?? [];
  return (
    <Screen
      header={<TopBar title="개인 일정" onBack={() => router.back()} />}
      contentStyle={styles.content}
      footer={
        <Footer>
          <Button label="개인 일정 추가" onPress={() => router.push('/events/new')} icon={(c) => <IconPlus size={17} color={c} />} />
        </Footer>
      }
    >
      <AppText variant="small" tone="soft">
        수업·모임처럼 작업을 못 하는 시간을 넣으면 그날 가용 시간에서 빼요. 추가하거나 지운 일정은 다음 등록이나 &quot;작업 다시 배치&quot; 때 일정에 반영돼요.
      </AppText>
      {events.isPending ? (
        <Loading />
      ) : events.isError ? (
        <LoadError error={events.error} onRetry={() => events.refetch()} />
      ) : list.length === 0 ? (
        <AppText tone="soft">아직 개인 일정이 없어요.</AppText>
      ) : (
        <View style={styles.list}>
          {list.map((e) => (
            <Card key={e.id} style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="label">{e.title}</AppText>
                <AppText variant="caption" tone="soft">
                  {describeEvent(e)}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${e.title} 삭제`} onPress={() => confirmDelete(e)} hitSlop={8} style={styles.delete}>
                <IconTrash size={18} color={colors.inkSoft} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 16 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  flex: { flex: 1, gap: 4 },
  delete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
