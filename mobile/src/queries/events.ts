import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createEvent, deleteEvent, listEvents, type NewPersonalEvent } from '@/api/events';

import { queryKeys } from './keys';

export const useEvents = () => useQuery({ queryKey: queryKeys.events, queryFn: () => listEvents() });

/**
 * 추가·삭제 — 서버는 다시 배치하지 않는다(다음 등록·다시 배치 때 반영, 사용자 결정 2026-10-17).
 * 일정 스냅샷은 새로 받는다: 오늘 화면·달력의 개인 일정 표시와 날짜별 가용 시간이 바뀐다.
 */
function useInvalidateEvents() {
  const client = useQueryClient();
  return () => Promise.all([client.invalidateQueries({ queryKey: queryKeys.events }), client.invalidateQueries({ queryKey: queryKeys.schedule })]);
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (event: NewPersonalEvent) => createEvent(event), onSuccess: () => invalidate() });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (id: number) => deleteEvent(id), onSuccess: () => invalidate() });
}
