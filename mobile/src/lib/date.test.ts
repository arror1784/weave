import { addDays, dDayLabel, dayOfMonth, diffInDays, formatDateLabel, formatMonthEyebrow, formatShortDate, monthGrid, startOfMonthShift, toDateKey, todayKey, weekDays, weekdayLabel, datesBetween } from './date';

describe('date', () => {
  it('Date를 로컬 기준 YYYY-MM-DD 키로 바꾼다', () => {
    expect(toDateKey(new Date(2026, 8, 18))).toBe('2026-09-18');
  });

  it('날짜 키에 일수를 더한다 (월 경계 포함)', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-09-30', -5)).toBe('2026-09-25');
  });

  it('두 날짜 사이의 일수를 계산한다', () => {
    expect(diffInDays('2026-09-25', '2026-09-30')).toBe(5);
    expect(diffInDays('2026-10-07', '2026-09-30')).toBe(-7);
  });

  it('남은 날은 D-n, 당일은 D-Day, 지난 날은 D+n으로 표시한다', () => {
    expect(dDayLabel('2026-10-07', '2026-09-30')).toBe('D-7');
    expect(dDayLabel('2026-09-30', '2026-09-30')).toBe('D-Day');
    expect(dDayLabel('2026-09-25', '2026-09-30')).toBe('D+5');
  });

  it('날짜를 "9월 18일 금요일", "10/1", 요일 한 글자로 표시한다', () => {
    expect(formatDateLabel('2026-09-18')).toBe('9월 18일 금요일');
    expect(formatShortDate('2026-10-01')).toBe('10/1');
    expect(weekdayLabel('2026-10-01')).toBe('목');
    expect(dayOfMonth('2026-10-01')).toBe(1);
  });

  it('상단 작은 표시용으로 "2026 · SEP"를 만든다', () => {
    expect(formatMonthEyebrow('2026-09-30')).toBe('2026 · SEP');
  });

  it('그 주의 월요일부터 일요일까지 7일을 돌려준다', () => {
    expect(weekDays('2026-09-30')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weekDays('2026-10-04')[0]).toBe('2026-09-28');
  });

  it('월간 달력: 월요일 시작, 1일 앞은 빈칸(null), 7의 배수 칸', () => {
    const cells = monthGrid('2026-10-15');
    // 2026-10-01은 목요일 → 앞에 월·화·수 3칸이 빈칸
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });

  it('하루는 아침 6시에 바뀐다 — 새벽 5시 59분까지는 전날 (사용자 결정 2026-10-01, 서버와 같은 기준)', () => {
    expect(todayKey(new Date(2026, 9, 1, 5, 59))).toBe('2026-09-30');
    expect(todayKey(new Date(2026, 9, 1, 6, 0))).toBe('2026-10-01');
    expect(todayKey(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01');
  });

  it('달 이동: 그 달 1일을 기준으로 앞뒤 달의 1일을 준다 (연도 넘어감 포함)', () => {
    expect(startOfMonthShift('2026-09-30', 1)).toBe('2026-10-01');
    expect(startOfMonthShift('2026-12-15', 1)).toBe('2027-01-01');
    expect(startOfMonthShift('2026-01-31', -1)).toBe('2025-12-01');
    expect(startOfMonthShift('2026-09-30', 0)).toBe('2026-09-01');
  });
});

describe('datesBetween', () => {
  it('양 끝을 포함한 사이 날짜를 모두 — 거꾸로 줘도 같다, 달을 넘어도 된다', () => {
    expect(datesBetween('2026-09-29', '2026-10-01')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
    expect(datesBetween('2026-10-01', '2026-09-29')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
    expect(datesBetween('2026-09-29', '2026-09-29')).toEqual(['2026-09-29']);
  });
});
