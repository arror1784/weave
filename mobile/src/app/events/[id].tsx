import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/AppText';
import { EventForm } from '@/components/EventForm';
import { LoadError, Loading } from '@/components/QueryStatus';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { useEvents, useUpdateEvent } from '@/queries/events';
import { useToday } from '@/queries/use-today';

/** 설정 → 개인 일정 → 누르면 수정(사용자 결정 2026-10-23 — 종류까지 모든 칸). 저장하면 서버가 바로 다시 배치한다 */
export default function EditEventScreen() {
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const events = useEvents();
  const update = useUpdateEvent();
  const [serverError, setServerError] = useState<string | null>(null);
  const event = events.data?.items.find((e) => e.id === Number(id));

  if (!event) {
    return (
      <Screen header={<TopBar title="개인 일정 수정" onBack={() => router.back()} />} contentStyle={styles.content}>
        {events.isPending ? (
          <Loading />
        ) : events.isError ? (
          <LoadError error={events.error} onRetry={() => events.refetch()} />
        ) : (
          <AppText tone="soft">일정을 찾을 수 없어요.</AppText>
        )}
      </Screen>
    );
  }

  return (
    <EventForm
      key={event.id}
      title="개인 일정 수정"
      initial={event}
      today={today}
      pending={update.isPending}
      serverError={serverError}
      onBack={() => router.back()}
      onSubmit={(body) => {
        setServerError(null);
        update.mutate(
          { id: event.id, event: body },
          {
            onSuccess: () => {
              toast('개인 일정을 고쳤어요');
              router.back();
            },
            onError: (e) => setServerError(errorMessage(e)),
          },
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
});
