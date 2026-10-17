import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, updateSettings, type SettingsChange } from '@/api/auth';

import { queryKeys } from './keys';

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: getMe });

/** 하루 가용 시간·상시 프로젝트 칸 — 일정 배정·과부하 기준이 바뀌므로 일정 스냅샷도 새로 받는다 */
export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: SettingsChange) => updateSettings(changes),
    onSuccess: (user) => {
      client.setQueryData(queryKeys.me, user);
      return client.invalidateQueries({ queryKey: queryKeys.schedule });
    },
  });
}
