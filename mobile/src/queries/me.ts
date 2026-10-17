import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, updateSettings, type SettingsChange } from '@/api/auth';

import { queryKeys } from './keys';

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: getMe });

/** 요일별 가용 시간·상시 프로젝트 칸 */
export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: SettingsChange) => updateSettings(changes),
    // 가용 시간·상시 칸을 바꾸면 서버가 바로 다시 배치한다(사용자 결정 2026-10-17) — 일정과 프로젝트 상세(간트)를 새로 받는다
    onSuccess: (user) => {
      client.setQueryData(queryKeys.me, user);
      return Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.schedule }),
        client.invalidateQueries({ queryKey: queryKeys.projectsAll }),
        client.invalidateQueries({ queryKey: queryKeys.projectAll }),
      ]);
    },
  });
}
