import { useRouter } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/errors';
import { EventForm } from '@/components/EventForm';
import { useToast } from '@/components/Toast';
import { useCreateEvent } from '@/queries/events';
import { useToday } from '@/queries/use-today';

/** 설정 → 개인 일정 → 추가(사용자 결정 2026-10-17). 저장하면 서버가 바로 다시 배치한다(2026-10-23) */
export default function NewEventScreen() {
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const create = useCreateEvent();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <EventForm
      title="개인 일정 추가"
      today={today}
      pending={create.isPending}
      serverError={serverError}
      onBack={() => router.back()}
      onSubmit={(event) => {
        setServerError(null);
        create.mutate(event, {
          onSuccess: () => {
            toast('개인 일정을 추가했어요');
            router.back();
          },
          onError: (e) => setServerError(errorMessage(e)),
        });
      }}
    />
  );
}
