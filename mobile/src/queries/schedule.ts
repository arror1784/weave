import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSchedule, replanSchedule } from '@/api/projects';

import { queryKeys } from './keys';

/** 오늘·전체 일정·과부하 화면이 함께 쓰는 서버 스냅샷 */
export const useSchedule = () => useQuery({ queryKey: queryKeys.schedule, queryFn: getSchedule });

/** 설정의 "작업 다시 배치" — 다시 배치한 일정으로 캐시를 바꾸고 목록·상세도 새로 받는다 */
export function useReplan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: replanSchedule,
    onSuccess: (schedule) => {
      client.setQueryData(queryKeys.schedule, schedule);
      return Promise.all([client.invalidateQueries({ queryKey: queryKeys.projectsAll }), client.invalidateQueries({ queryKey: ['project'] })]);
    },
  });
}
