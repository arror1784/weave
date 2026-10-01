import { todayKey, type DateKey } from '@/lib/date';

import { useSchedule } from './schedule';

/** 오늘 날짜 — 서버 기준(한국 시간)을 쓰고, 아직 못 받았으면 기기 날짜 */
export function useToday(): DateKey {
  const { data } = useSchedule();
  return data?.today ?? todayKey();
}
