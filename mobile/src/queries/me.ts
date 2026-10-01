import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, updateSettings } from '@/api/auth';

import { queryKeys } from './keys';

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: getMe });

/** 하루 가용 시간 — 일정 배정·과부하 기준이 바뀌므로 일정 스냅샷도 새로 받는다 */
export function useUpdateDailyHours() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (hours: number) => updateSettings(hours),
    onSuccess: (user) => {
      client.setQueryData(queryKeys.me, user);
      return client.invalidateQueries({ queryKey: queryKeys.schedule });
    },
  });
}
