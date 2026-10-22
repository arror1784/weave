import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createEvent, deleteEvent, listEvents, updateEvent, type NewPersonalEvent } from '@/api/events';

import { queryKeys } from './keys';

export const useEvents = () => useQuery({ queryKey: queryKeys.events, queryFn: () => listEvents() });

/**
 * 추가·수정·삭제 — 서버가 밀린 작업까지 바로 다시 배치한다(사용자 결정 2026-10-23, 전엔 다음 배치 때 반영).
 * 그래서 개인 일정 목록과 함께 일정 스냅샷·프로젝트 목록·상세를 새로 받는다(설정에서 가용 시간을 바꿀 때와 같게).
 */
function useInvalidateEvents() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.events }),
      client.invalidateQueries({ queryKey: queryKeys.schedule }),
      client.invalidateQueries({ queryKey: queryKeys.projectsAll }),
      client.invalidateQueries({ queryKey: queryKeys.projectAll }),
    ]);
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (event: NewPersonalEvent) => createEvent(event), onSuccess: () => invalidate() });
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: ({ id, event }: { id: number; event: NewPersonalEvent }) => updateEvent(id, event), onSuccess: () => invalidate() });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (id: number) => deleteEvent(id), onSuccess: () => invalidate() });
}
