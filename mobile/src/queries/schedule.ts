import { useQuery } from '@tanstack/react-query';

import { getSchedule } from '@/api/projects';

import { queryKeys } from './keys';

/** 오늘·전체 일정·과부하 화면이 함께 쓰는 서버 스냅샷 */
export const useSchedule = () => useQuery({ queryKey: queryKeys.schedule, queryFn: getSchedule });
