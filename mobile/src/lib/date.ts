/** 날짜 키 'YYYY-MM-DD' (로컬 기준). 시간대 문제를 피하려고 날짜 계산은 이 키로만 한다. */
export type DateKey = string;

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** from에서 to까지 며칠인지 (to가 뒤면 양수). */
export function diffInDays(from: DateKey, to: DateKey): number {
  const ms = Date.UTC(...ymd(to)) - Date.UTC(...ymd(from));
  return Math.round(ms / 86_400_000);
}

function ymd(key: DateKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m - 1, d];
}

export function dDayLabel(target: DateKey, today: DateKey): string {
  const remaining = diffInDays(today, target);
  if (remaining === 0) return 'D-Day';
  return remaining > 0 ? `D-${remaining}` : `D+${-remaining}`;
}

export function formatDateLabel(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}`;
}

export function formatShortDate(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function weekdayLabel(key: DateKey): string {
  return WEEKDAYS[fromDateKey(key).getDay()][0];
}

export function dayOfMonth(key: DateKey): number {
  return fromDateKey(key).getDate();
}

export function monthOf(key: DateKey): number {
  return fromDateKey(key).getMonth() + 1;
}

export function formatMonthEyebrow(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getFullYear()} · ${MONTHS_EN[date.getMonth()]}`;
}

/** 그 주의 월요일~일요일 */
export function weekDays(key: DateKey): DateKey[] {
  const offset = (fromDateKey(key).getDay() + 6) % 7; // 월=0 … 일=6
  const monday = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 월간 달력 칸: 월요일 시작, 그 달이 아닌 칸은 null, 길이는 7의 배수 */
export function monthGrid(key: DateKey): (DateKey | null)[] {
  const date = fromDateKey(key);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (DateKey | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateKey(new Date(first.getFullYear(), first.getMonth(), d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
