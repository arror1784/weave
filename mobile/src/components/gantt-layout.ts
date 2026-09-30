import { diffInDays, type DateKey } from '@/lib/date';

/** 간트 막대를 보이는 범위(range) 안으로 자른 칸 단위 위치. 범위 밖이면 null */
export function barSpan(scheduledDate: DateKey, spanDays: number, range: DateKey[]): { start: number; length: number } | null {
  const from = diffInDays(range[0], scheduledDate);
  const to = from + spanDays; // 끝 칸 다음
  const start = Math.max(0, from);
  const end = Math.min(range.length, to);
  return end > start ? { start, length: end - start } : null;
}
